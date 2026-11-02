use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token, Address, Env, String,
};

struct Fixture {
    env: Env,
    client: CareBridgeClient<'static>,
    token: Address,
    token_admin: token::StellarAssetClient<'static>,
    patient: Address,
    provider: Address,
    verifier: Address,
    donor: Address,
    campaign_id: u64,
}

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin);
    let token = sac.address();
    let token_admin = token::StellarAssetClient::new(&env, &token);

    let patient = Address::generate(&env);
    let provider = Address::generate(&env);
    let verifier = Address::generate(&env);
    let donor = Address::generate(&env);

    let contract_id = env.register(CareBridge, ());
    let client = CareBridgeClient::new(&env, &contract_id);

    let campaign_id = client
        .initialize_campaign(
            &patient,
            &provider,
            &verifier,
            &token,
            &String::from_str(&env, "patient-001"),
            &String::from_str(&env, "Amina's cardiac surgery"),
            &String::from_str(&env, "Escrow for the verified cardiology invoice."),
            &1_000_i128,
        )
        .unwrap();

    token_admin.mint(&donor, &10_000_i128);

    Fixture {
        env,
        client,
        token,
        token_admin,
        patient,
        provider,
        verifier,
        donor,
        campaign_id,
    }
}

fn invoice(env: &Env, id: &str) -> String {
    String::from_str(env, id)
}

#[test]
fn initializes_a_campaign() {
    let f = setup();
    let campaign = f.client.get_campaign(&f.campaign_id).unwrap();

    assert_eq!(campaign.id, f.campaign_id);
    assert_eq!(campaign.patient, f.patient);
    assert_eq!(campaign.provider, f.provider);
    assert_eq!(campaign.verifier, f.verifier);
    assert_eq!(campaign.token, f.token);
    assert_eq!(campaign.patient_id, String::from_str(&f.env, "patient-001"));
    assert_eq!(
        campaign.title,
        String::from_str(&f.env, "Amina's cardiac surgery")
    );
    assert_eq!(campaign.target_amount, 1_000);
    assert_eq!(campaign.raised_amount, 0);
    assert_eq!(campaign.released_amount, 0);
    assert_eq!(campaign.refunded_amount, 0);
    assert_eq!(campaign.created_at, 1_700_000_000);
    assert_eq!(campaign.status, CampaignStatus::Active);
    assert_eq!(f.client.get_campaign_count(), 1);
}

#[test]
fn accepts_donations_into_escrow() {
    let f = setup();
    let token_client = token::Client::new(&f.env, &f.token);

    let raised = f.client.donate(&f.campaign_id, &f.donor, &400_i128).unwrap();

    assert_eq!(raised, 400);
    assert_eq!(f.client.get_contribution(&f.campaign_id, &f.donor), 400);
    assert_eq!(token_client.balance(&f.donor), 9_600);
    assert_eq!(token_client.balance(&f.client.address), 400);

    let campaign = f.client.get_campaign(&f.campaign_id).unwrap();
    assert_eq!(campaign.raised_amount, 400);
    assert_eq!(campaign.status, CampaignStatus::Active);
}

#[test]
fn completes_campaign_when_target_is_reached() {
    let f = setup();

    f.client
        .donate(&f.campaign_id, &f.donor, &1_000_i128)
        .unwrap();

    let campaign = f.client.get_campaign(&f.campaign_id).unwrap();
    assert_eq!(campaign.raised_amount, 1_000);
    assert_eq!(campaign.status, CampaignStatus::Completed);

    let late_donation = f.client.donate(&f.campaign_id, &f.donor, &1_i128);
    assert_eq!(late_donation, Err(Ok(Error::CampaignNotActive)));
}

#[test]
fn releases_funds_only_against_a_verified_invoice() {
    let f = setup();
    let token_client = token::Client::new(&f.env, &f.token);

    f.client
        .donate(&f.campaign_id, &f.donor, &600_i128)
        .unwrap();

    let unverified = f.client.release_funds(
        &f.campaign_id,
        &invoice(&f.env, "INV-404"),
        &100_i128,
        &f.provider,
    );
    assert_eq!(unverified, Err(Ok(Error::InvoiceNotFound)));

    f.client
        .verify_invoice(&f.campaign_id, &invoice(&f.env, "INV-001"), &250_i128)
        .unwrap();

    let released = f
        .client
        .release_funds(
            &f.campaign_id,
            &invoice(&f.env, "INV-001"),
            &250_i128,
            &f.provider,
        )
        .unwrap();

    assert_eq!(released, 250);
    assert_eq!(token_client.balance(&f.provider), 250);
    assert_eq!(token_client.balance(&f.client.address), 350);

    let stored_invoice = f
        .client
        .get_invoice(&f.campaign_id, &invoice(&f.env, "INV-001"))
        .unwrap();
    assert_eq!(stored_invoice.released_amount, 250);

    let campaign = f.client.get_campaign(&f.campaign_id).unwrap();
    assert_eq!(campaign.released_amount, 250);
    assert_eq!(campaign.raised_amount, 600);

    let over_release = f.client.release_funds(
        &f.campaign_id,
        &invoice(&f.env, "INV-001"),
        &1_i128,
        &f.provider,
    );
    assert_eq!(over_release, Err(Ok(Error::InvoiceAmountExceeded)));
}

#[test]
fn rejects_release_to_an_unrelated_recipient() {
    let f = setup();
    let attacker = Address::generate(&f.env);

    f.client
        .donate(&f.campaign_id, &f.donor, &500_i128)
        .unwrap();
    f.client
        .verify_invoice(&f.campaign_id, &invoice(&f.env, "INV-002"), &100_i128)
        .unwrap();

    let result = f.client.release_funds(
        &f.campaign_id,
        &invoice(&f.env, "INV-002"),
        &100_i128,
        &attacker,
    );

    assert_eq!(result, Err(Ok(Error::InvalidRecipient)));
}

#[test]
fn prevents_duplicate_invoice_verification() {
    let f = setup();
    let id = invoice(&f.env, "INV-DUP");

    f.client
        .verify_invoice(&f.campaign_id, &id, &100_i128)
        .unwrap();
    let duplicate = f.client.verify_invoice(&f.campaign_id, &id, &200_i128);

    assert_eq!(duplicate, Err(Ok(Error::InvoiceAlreadyVerified)));
}

#[test]
fn refunds_donors_when_a_campaign_fails() {
    let f = setup();
    let token_client = token::Client::new(&f.env, &f.token);

    f.client
        .donate(&f.campaign_id, &f.donor, &300_i128)
        .unwrap();
    f.client.refund_campaign(&f.campaign_id).unwrap();

    let refunded = f
        .client
        .claim_refund(&f.campaign_id, &f.donor)
        .unwrap();

    assert_eq!(refunded, 300);
    assert_eq!(token_client.balance(&f.donor), 10_000);
    assert_eq!(token_client.balance(&f.client.address), 0);

    let campaign = f.client.get_campaign(&f.campaign_id).unwrap();
    assert_eq!(campaign.status, CampaignStatus::Refunded);
    assert_eq!(campaign.refunded_amount, 300);

    let second_claim = f.client.claim_refund(&f.campaign_id, &f.donor);
    assert_eq!(second_claim, Err(Ok(Error::NothingToRefund)));
}

#[test]
fn lists_campaigns_in_id_order() {
    let f = setup();

    let second_id = f
        .client
        .initialize_campaign(
            &f.patient,
            &f.provider,
            &f.verifier,
            &f.token,
            &String::from_str(&f.env, "patient-002"),
            &String::from_str(&f.env, "Second campaign"),
            &String::from_str(&f.env, "Second campaign description"),
            &2_000_i128,
        )
        .unwrap();

    let campaigns = f.client.get_campaigns(&1_u64, &10_u32);
    assert_eq!(campaigns.len(), 2);
    assert_eq!(campaigns.get(0).unwrap().id, f.campaign_id);
    assert_eq!(campaigns.get(1).unwrap().id, second_id);

    let page = f.client.get_campaigns(&2_u64, &1_u32);
    assert_eq!(page.len(), 1);
    assert_eq!(page.get(0).unwrap().id, second_id);
}

#[test]
fn rejects_invalid_amounts_and_targets() {
    let f = setup();

    let zero_target = f.client.initialize_campaign(
        &f.patient,
        &f.provider,
        &f.verifier,
        &f.token,
        &String::from_str(&f.env, "patient-bad"),
        &String::from_str(&f.env, "Bad campaign"),
        &String::from_str(&f.env, "Invalid target"),
        &0_i128,
    );
    assert_eq!(zero_target, Err(Ok(Error::InvalidTarget)));

    let zero_donation = f.client.donate(&f.campaign_id, &f.donor, &0_i128);
    assert_eq!(zero_donation, Err(Ok(Error::InvalidAmount)));
}
