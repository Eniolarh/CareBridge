"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StrKey } from "@stellar/stellar-sdk/base";
import { humanizeError, initializeCampaign } from "@/lib/carebridge";
import { DEFAULT_TOKEN } from "@/lib/stellar";
import { TOKEN_OPTIONS } from "@/lib/tokens";
import { toStroops } from "@/lib/format";
import type { CreateCampaignInput } from "@/lib/types";
import { useWallet } from "@/lib/wallet";
import { cn } from "@/lib/cn";
import { Button } from "./ui/button";
import { Field, Input, Textarea } from "./ui/field";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LoaderIcon,
  LockIcon,
  ShieldIcon,
  StethoscopeIcon,
  WalletIcon,
} from "./icons";

interface FormState {
  title: string;
  description: string;
  patientId: string;
  target: string;
  token: string;
  provider: string;
  verifier: string;
}

const initialState: FormState = {
  title: "",
  description: "",
  patientId: "",
  target: "",
  token: DEFAULT_TOKEN || TOKEN_OPTIONS[0]?.id || "",
  provider: "",
  verifier: "",
};

export function CreateCampaignForm() {
  const { address, connect, isConnecting, sign, isWrongNetwork } = useWallet();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createdId, setCreatedId] = useState<bigint | null>(null);

  useEffect(() => {
    if (address && !form.verifier) {
      setForm((current) => ({ ...current, verifier: address }));
    }
  }, [address, form.verifier]);

  const customToken = useMemo(
    () => form.token.length > 0 && !TOKEN_OPTIONS.some((token) => token.id === form.token),
    [form.token],
  );

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!address) next.provider = "Connect your Freighter wallet first.";
    if (form.title.trim().length < 4) next.title = "Give the campaign a short title.";
    if (form.description.trim().length < 20) {
      next.description = "Describe the medical need in at least 20 characters.";
    }
    if (!form.patientId.trim()) next.patientId = "Add a patient or case identifier.";
    if (!StrKey.isValidEd25519PublicKey(form.provider.trim())) {
      next.provider = "Enter a valid Stellar G-address for the medical provider.";
    }
    if (!StrKey.isValidEd25519PublicKey(form.verifier.trim())) {
      next.verifier = "Enter a valid Stellar G-address for the verifier.";
    }
    if (!StrKey.isValidContract(form.token.trim())) {
      next.token = "Enter a valid Stellar C-address for the token contract.";
    }

    try {
      toStroops(form.target);
    } catch {
      next.target = "Enter a funding target greater than zero.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!address) {
      await connect();
      return;
    }
    if (!validate()) return;

    const input: CreateCampaignInput = {
      patient: address,
      provider: form.provider.trim(),
      verifier: form.verifier.trim(),
      token: form.token.trim(),
      patientId: form.patientId.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      targetAmount: toStroops(form.target),
    };

    setPending(true);
    try {
      const result = await initializeCampaign(input, sign);
      setCreatedId(BigInt(result.value));
      setForm({ ...initialState, token: form.token });
    } catch (cause) {
      setSubmitError(humanizeError(cause));
    } finally {
      setPending(false);
    }
  };

  if (createdId !== null) {
    return (
      <div className="surface mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-care-100 text-care-700">
          <CheckCircleIcon className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink-950">
          Campaign #{createdId.toString()} is live
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Your escrow is deployed on Stellar. Share the campaign page with your provider,
          verifier and supporters so they can start funding.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/campaigns/${createdId.toString()}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-care-700 px-5 text-sm font-semibold text-white hover:bg-care-800"
          >
            Open campaign
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Button
            variant="secondary"
            onClick={() => setCreatedId(null)}
            className="h-11"
          >
            Create another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="surface p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-care-50 text-care-700 ring-1 ring-care-100">
              <StethoscopeIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink-950">The medical need</h2>
              <p className="text-xs text-ink-500">This is what donors will see.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <Field label="Campaign title" error={errors.title}>
              <Input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Help Amina complete cardiac surgery"
                maxLength={120}
              />
            </Field>

            <Field
              label="Description"
              error={errors.description}
              hint="Explain the treatment, hospital and why the funds are needed."
            >
              <Textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Amina is a 34-year-old patient awaiting a verified cardiac procedure at St. Mary's Hospital..."
                maxLength={600}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Patient / case ID"
                error={errors.patientId}
                hint="A non-sensitive reference, not a national ID."
              >
                <Input
                  value={form.patientId}
                  onChange={(event) => update("patientId", event.target.value)}
                  placeholder="CASE-2026-0142"
                  maxLength={64}
                />
              </Field>
              <Field
                label="Funding target"
                error={errors.target}
                hint={`Amount in ${TOKEN_OPTIONS.find((token) => token.id === form.token)?.symbol ?? "token"} units.`}
              >
                <Input
                  inputMode="decimal"
                  value={form.target}
                  onChange={(event) =>
                    update("target", event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="12000"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="surface p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink-950">
                Provider and verifier
              </h2>
              <p className="text-xs text-ink-500">
                Two separate roles control treatment and release.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <Field
              label="Medical provider address"
              error={errors.provider}
              hint="The clinic or hospital that will receive released funds."
            >
              <Input
                value={form.provider}
                onChange={(event) => update("provider", event.target.value)}
                placeholder="G..."
                className="font-mono text-xs"
              />
            </Field>
            <Field
              label="Independent verifier address"
              error={errors.verifier}
              hint="Approves invoices and authorizes each release. Use a trusted third party."
            >
              <Input
                value={form.verifier}
                onChange={(event) => update("verifier", event.target.value)}
                placeholder="G..."
                className="font-mono text-xs"
              />
            </Field>

            <div>
              <span className="text-sm font-semibold text-ink-800">Donation token</span>
              {TOKEN_OPTIONS.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {TOKEN_OPTIONS.map((token) => (
                    <button
                      key={token.id}
                      type="button"
                      onClick={() => update("token", token.id)}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition",
                        form.token === token.id
                          ? "border-care-400 bg-care-50 text-care-800"
                          : "border-ink-200 bg-white text-ink-600 hover:border-care-200",
                      )}
                    >
                      {token.symbol}
                      <span className="font-normal text-ink-400">{token.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => update("token", "")}
                    className={cn(
                      "inline-flex h-10 items-center rounded-xl border px-3.5 text-sm font-semibold transition",
                      customToken || !form.token
                        ? "border-care-400 bg-care-50 text-care-800"
                        : "border-ink-200 bg-white text-ink-600 hover:border-care-200",
                    )}
                  >
                    Custom SAC
                  </button>
                </div>
              ) : null}

              {customToken || TOKEN_OPTIONS.length === 0 || !form.token ? (
                <div className="mt-3">
                  <Input
                    value={form.token}
                    onChange={(event) => update("token", event.target.value)}
                    placeholder="C... Stellar asset contract address"
                    className="font-mono text-xs"
                  />
                  <p className="mt-1.5 text-xs text-ink-500">
                    Use the SAC address of XLM, USDC or another Stellar asset.
                  </p>
                </div>
              ) : null}
              {errors.token ? (
                <p className="mt-1.5 text-xs font-medium text-coral-700">{errors.token}</p>
              ) : null}
            </div>
          </div>
        </section>

        {isWrongNetwork ? (
          <div className="flex items-start gap-3 rounded-2xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Your Freighter wallet is on a different network. Switch it to Stellar testnet
              before creating a campaign.
            </p>
          </div>
        ) : null}

        {submitError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        ) : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <WalletIcon className="h-4 w-4 text-care-700" />
            Campaign owner
          </div>
          {address ? (
            <p className="mt-2 break-all rounded-lg bg-ink-50 px-3 py-2 font-mono text-[11px] text-ink-700">
              {address}
            </p>
          ) : (
            <div className="mt-3">
              <p className="text-xs leading-relaxed text-ink-500">
                Connect the patient wallet. The patient authorizes the campaign on-chain.
              </p>
              <Button
                className="mt-3 w-full"
                onClick={() => void connect()}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <LoaderIcon className="h-4 w-4" />
                ) : (
                  <WalletIcon className="h-4 w-4" />
                )}
                Connect Freighter
              </Button>
            </div>
          )}

          <div className="mt-4 space-y-3 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-600">
            <p className="flex items-start gap-2">
              <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-care-600" />
              Donations stay in the contract escrow — CareBridge never holds your keys.
            </p>
            <p className="flex items-start gap-2">
              <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-care-600" />
              The verifier must approve each invoice before any release.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          <p className="font-semibold">Before you publish</p>
          <p className="mt-1">
            Get explicit consent from the patient and provider. Never put sensitive medical
            details or national identifiers on-chain.
          </p>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => void handleSubmit()}
          disabled={pending || !address}
        >
          {pending ? (
            <>
              <LoaderIcon className="h-4 w-4" />
              Deploying campaign
            </>
          ) : (
            <>
              Create campaign
              <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </Button>

        <Link
          href="/"
          className="block text-center text-xs font-semibold text-ink-500 hover:text-care-700"
        >
          Back to campaigns
        </Link>
      </aside>
    </div>
  );
}
