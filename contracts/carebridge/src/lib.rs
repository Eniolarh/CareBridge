#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
    Vec,
};

const TTL_THRESHOLD: u32 = 120_960;
const TTL_EXTEND: u32 = 518_400;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CampaignStatus {
    Active,
    Completed,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub id: u64,
    pub patient_id: String,
    pub title: String,
    pub description: String,
    pub patient: Address,
    pub provider: Address,
    pub verifier: Address,
    pub token: Address,
    pub target_amount: i128,
    pub raised_amount: i128,
    pub released_amount: i128,
    pub refunded_amount: i128,
    pub created_at: u64,
    pub status: CampaignStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub invoice_id: String,
    pub amount: i128,
    pub released_amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NextCampaignId,
    Campaign(u64),
    Contribution(u64, Address),
    Invoice(u64, String),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    CampaignNotFound = 1,
    InvalidAmount = 2,
    InvalidTarget = 3,
    CampaignNotActive = 4,
    CampaignNotRefundable = 5,
    InvoiceAlreadyVerified = 6,
    InvoiceNotFound = 7,
    InvoiceAmountExceeded = 8,
    InvalidRecipient = 9,
    InsufficientEscrow = 10,
    NothingToRefund = 11,
    Overflow = 12,
}

#[contract]
pub struct CareBridge;

#[contractimpl]
impl CareBridge {
    /// Creates a verified patient campaign. The patient authorizes the campaign
    /// and names the medical provider plus the independent invoice verifier.
    pub fn initialize_campaign(
        env: Env,
        patient: Address,
        provider: Address,
        verifier: Address,
        token: Address,
        patient_id: String,
        title: String,
        description: String,
        target_amount: i128,
    ) -> Result<u64, Error> {
        patient.require_auth();

        if target_amount <= 0 {
            return Err(Error::InvalidTarget);
        }

        let next_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextCampaignId)
            .unwrap_or(0);
        let campaign_id = next_id.checked_add(1).ok_or(Error::Overflow)?;
        env.storage()
            .instance()
            .set(&DataKey::NextCampaignId, &campaign_id);

        let campaign = Campaign {
            id: campaign_id,
            patient_id,
            title,
            description,
            patient: patient.clone(),
            provider,
            verifier,
            token,
            target_amount,
            raised_amount: 0,
            released_amount: 0,
            refunded_amount: 0,
            created_at: env.ledger().timestamp(),
            status: CampaignStatus::Active,
        };

        let key = DataKey::Campaign(campaign_id);
        env.storage().persistent().set(&key, &campaign);
        bump_persistent(&env, &key);

        env.events()
            .publish((symbol_short!("campaign"), campaign_id), patient);

        Ok(campaign_id)
    }

    /// Contributes the campaign's configured token (XLM SAC or USDC) into escrow.
    pub fn donate(
        env: Env,
        campaign_id: u64,
        donor: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        donor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let campaign_key = DataKey::Campaign(campaign_id);
        let mut campaign = load_campaign(&env, campaign_id)?;
        if campaign.status != CampaignStatus::Active {
            return Err(Error::CampaignNotActive);
        }

        token::Client::new(&env, &campaign.token).transfer(
            &donor,
            &env.current_contract_address(),
            &amount,
        );

        campaign.raised_amount = campaign
            .raised_amount
            .checked_add(amount)
            .ok_or(Error::Overflow)?;

        if campaign.raised_amount >= campaign.target_amount {
            campaign.status = CampaignStatus::Completed;
        }

        let contribution_key = DataKey::Contribution(campaign_id, donor.clone());
        let previous: i128 = env
            .storage()
            .persistent()
            .get(&contribution_key)
            .unwrap_or(0);
        let contribution = previous.checked_add(amount).ok_or(Error::Overflow)?;

        env.storage().persistent().set(&campaign_key, &campaign);
        env.storage()
            .persistent()
            .set(&contribution_key, &contribution);
        bump_persistent(&env, &campaign_key);
        bump_persistent(&env, &contribution_key);

        env.events().publish(
            (symbol_short!("donate"), campaign_id, donor),
            campaign.raised_amount,
        );

        Ok(campaign.raised_amount)
    }

    /// The independent verifier records a verified medical invoice and its
    /// maximum releasable amount. Invoice IDs cannot be verified twice.
    pub fn verify_invoice(
        env: Env,
        campaign_id: u64,
        invoice_id: String,
        amount: i128,
    ) -> Result<(), Error> {
        let campaign = load_campaign(&env, campaign_id)?;
        campaign.verifier.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if campaign.status == CampaignStatus::Refunded {
            return Err(Error::CampaignNotActive);
        }

        let invoice_key = DataKey::Invoice(campaign_id, invoice_id.clone());
        if env.storage().persistent().has(&invoice_key) {
            return Err(Error::InvoiceAlreadyVerified);
        }

        let invoice = Invoice {
            invoice_id: invoice_id.clone(),
            amount,
            released_amount: 0,
        };
        env.storage().persistent().set(&invoice_key, &invoice);
        bump_persistent(&env, &invoice_key);

        env.events().publish(
            (symbol_short!("invoice"), campaign_id),
            (invoice_id, amount),
        );

        Ok(())
    }

    /// Releases escrow only against a verified invoice. The verifier authorizes
    /// the release and funds can only go to the provider or the patient.
    pub fn release_funds(
        env: Env,
        campaign_id: u64,
        invoice_id: String,
        amount: i128,
        recipient: Address,
    ) -> Result<i128, Error> {
        let campaign_key = DataKey::Campaign(campaign_id);
        let mut campaign = load_campaign(&env, campaign_id)?;
        campaign.verifier.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if campaign.status == CampaignStatus::Refunded {
            return Err(Error::CampaignNotActive);
        }
        if recipient != campaign.provider && recipient != campaign.patient {
            return Err(Error::InvalidRecipient);
        }

        let invoice_key = DataKey::Invoice(campaign_id, invoice_id);
        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&invoice_key)
            .ok_or(Error::InvoiceNotFound)?;

        let invoice_remaining = invoice
            .amount
            .checked_sub(invoice.released_amount)
            .ok_or(Error::Overflow)?;
        if amount > invoice_remaining {
            return Err(Error::InvoiceAmountExceeded);
        }

        let escrow_balance = campaign
            .raised_amount
            .checked_sub(campaign.released_amount)
            .and_then(|value| value.checked_sub(campaign.refunded_amount))
            .ok_or(Error::Overflow)?;
        if amount > escrow_balance {
            return Err(Error::InsufficientEscrow);
        }

        token::Client::new(&env, &campaign.token).transfer(
            &env.current_contract_address(),
            &recipient,
            &amount,
        );

        invoice.released_amount = invoice
            .released_amount
            .checked_add(amount)
            .ok_or(Error::Overflow)?;
        campaign.released_amount = campaign
            .released_amount
            .checked_add(amount)
            .ok_or(Error::Overflow)?;

        env.storage().persistent().set(&campaign_key, &campaign);
        env.storage().persistent().set(&invoice_key, &invoice);
        bump_persistent(&env, &campaign_key);
        bump_persistent(&env, &invoice_key);

        env.events().publish(
            (symbol_short!("release"), campaign_id, recipient),
            amount,
        );

        Ok(campaign.released_amount)
    }

    /// Opens refunds for an active campaign that has not reached its target.
    pub fn refund_campaign(env: Env, campaign_id: u64) -> Result<(), Error> {
        let campaign_key = DataKey::Campaign(campaign_id);
        let mut campaign = load_campaign(&env, campaign_id)?;
        campaign.verifier.require_auth();

        if campaign.status != CampaignStatus::Active
            || campaign.raised_amount >= campaign.target_amount
        {
            return Err(Error::CampaignNotRefundable);
        }

        campaign.status = CampaignStatus::Refunded;
        env.storage().persistent().set(&campaign_key, &campaign);
        bump_persistent(&env, &campaign_key);

        env.events()
            .publish((symbol_short!("refund"), campaign_id), ());

        Ok(())
    }

    /// A donor claims back their full contribution after a campaign is refunded.
    pub fn claim_refund(env: Env, campaign_id: u64, donor: Address) -> Result<i128, Error> {
        donor.require_auth();

        let campaign_key = DataKey::Campaign(campaign_id);
        let mut campaign = load_campaign(&env, campaign_id)?;
        if campaign.status != CampaignStatus::Refunded {
            return Err(Error::CampaignNotRefundable);
        }

        let contribution_key = DataKey::Contribution(campaign_id, donor.clone());
        let contribution: i128 = env
            .storage()
            .persistent()
            .get(&contribution_key)
            .unwrap_or(0);
        if contribution <= 0 {
            return Err(Error::NothingToRefund);
        }

        token::Client::new(&env, &campaign.token).transfer(
            &env.current_contract_address(),
            &donor,
            &contribution,
        );

        campaign.refunded_amount = campaign
            .refunded_amount
            .checked_add(contribution)
            .ok_or(Error::Overflow)?;
        env.storage()
            .persistent()
            .set(&contribution_key, &0_i128);
        env.storage().persistent().set(&campaign_key, &campaign);
        bump_persistent(&env, &campaign_key);
        bump_persistent(&env, &contribution_key);

        env.events()
            .publish((symbol_short!("claim"), campaign_id, donor), contribution);

        Ok(contribution)
    }

    pub fn get_campaign(env: Env, campaign_id: u64) -> Result<Campaign, Error> {
        load_campaign(&env, campaign_id)
    }

    /// Returns a page of campaigns ordered by id, skipping gaps. This lets the
    /// dashboard load every campaign with two read-only simulations.
    pub fn get_campaigns(env: Env, start_id: u64, limit: u32) -> Vec<Campaign> {
        let count = Self::get_campaign_count(env.clone());
        let mut campaigns = Vec::new(&env);

        if count == 0 || limit == 0 {
            return campaigns;
        }

        let start = if start_id == 0 { 1 } else { start_id };
        let end = start.saturating_add(limit as u64);
        let mut id = start;

        while id <= count && id < end {
            let value: Option<Campaign> =
                env.storage().persistent().get(&DataKey::Campaign(id));
            if let Some(campaign) = value {
                campaigns.push_back(campaign);
            }
            id += 1;
        }

        campaigns
    }

    pub fn get_campaign_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextCampaignId)
            .unwrap_or(0)
    }

    pub fn get_contribution(env: Env, campaign_id: u64, donor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(campaign_id, donor))
            .unwrap_or(0)
    }

    pub fn get_invoice(env: Env, campaign_id: u64, invoice_id: String) -> Option<Invoice> {
        env.storage()
            .persistent()
            .get(&DataKey::Invoice(campaign_id, invoice_id))
    }
}

fn load_campaign(env: &Env, campaign_id: u64) -> Result<Campaign, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Campaign(campaign_id))
        .ok_or(Error::CampaignNotFound)
}

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND);
}

#[cfg(test)]
mod test;
