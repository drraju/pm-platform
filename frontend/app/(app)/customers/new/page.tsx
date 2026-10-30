"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerForm } from "@/features/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="The same customer record is shared by sales, customer success, and delivery."
        eyebrow="Customers"
        title="Add a customer"
      />
      <Link className="inline-flex text-sm font-medium text-brand hover:text-teal-800" href="/customers">
        Back to customers
      </Link>
      <CustomerForm />
    </div>
  );
}
