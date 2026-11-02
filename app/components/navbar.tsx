"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./logo";
import { WalletButton } from "./wallet-button";
import { PlusIcon, XIcon } from "./icons";
import { buttonClasses } from "./ui/button";

const links = [
  { href: "/#campaigns", label: "Campaigns" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#transparency", label: "Transparency" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-[#f7faf8]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-white hover:text-ink-950"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/campaigns/new"
            className={buttonClasses({ variant: "secondary", size: "sm", className: "hidden sm:inline-flex h-10" })}
          >
            <PlusIcon className="h-4 w-4" />
            Start a campaign
          </Link>
          <WalletButton />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <XIcon className="h-5 w-5" /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/campaigns/new"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-lg bg-care-50 px-3 py-2.5 text-sm font-semibold text-care-800"
            >
              <PlusIcon className="h-4 w-4" />
              Start a campaign
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
