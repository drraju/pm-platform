"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  executeAiPlaygroundRequest,
  getAiPlaygroundHistory,
  getAiPlaygroundRegistries,
  getAiPlaygroundTrace,
  replayAiPlaygroundExecution,
  type ApiAiPlaygroundHistoryItem,
  type ApiAiPlaygroundRegistrySnapshot,
  type ApiAiPlaygroundTrace,
} from "@/lib/api/client";

const executionStates = [
  "Created",
  "Validated",
  "Planned",
  "ContextResolved",
  "PromptResolved",
  "SkillResolved",
  "ProviderSelected",
  "Executing",
  "Completed",
];

const fallbackRegistries: ApiAiPlaygroundRegistrySnapshot = {
  capabilities: [{ id: "chat", name: "Chat" }],
  conversations: [
    {
      id: "internal-assistant-conversation",
      name: "Internal Assistant Conversation",
    },
  ],
  prompts: [],
  providers: [{ id: "mock", name: "Mock AI Provider" }],
  sessions: [],
  skills: [],
};

type JsonTab = "request" | "response" | "trace" | "diagnostics" | "events";

export default function AiPlaygroundPage() {
  const [capability, setCapability] = useState("chat");
  const [conversation, setConversation] = useState(
    "internal-assistant-conversation",
  );
  const [provider, setProvider] = useState("mock");
  const [project, setProject] = useState("project-1");
  const [requestText, setRequestText] = useState(
    "Summarize the current delivery status for this project.",
  );
  const [registries, setRegistries] =
    useState<ApiAiPlaygroundRegistrySnapshot>(fallbackRegistries);
  const [history, setHistory] = useState<ApiAiPlaygroundHistoryItem[]>([]);
  const [trace, setTrace] = useState<ApiAiPlaygroundTrace | null>(null);
  const [activeStateIndex, setActiveStateIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<JsonTab>("request");
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshRegistries();
    void refreshHistory();
  }, []);

  useEffect(() => {
    if (!isExecuting) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveStateIndex((value) =>
        Math.min(value + 1, executionStates.length - 2),
      );
    }, 180);

    return () => window.clearInterval(timer);
  }, [isExecuting]);

  const jsonPayload = useMemo(() => {
    if (!trace) {
      return {
        capability,
        conversation,
        project,
        provider,
        request: requestText,
      };
    }

    const payloads: Record<JsonTab, unknown> = {
      diagnostics: trace.diagnostics,
      events: trace.eventTimeline,
      request: trace.request,
      response: trace.finalResult,
      trace,
    };

    return payloads[activeTab];
  }, [
    activeTab,
    capability,
    conversation,
    project,
    provider,
    requestText,
    trace,
  ]);

  async function refreshRegistries() {
    try {
      setRegistries(await getAiPlaygroundRegistries());
    } catch {
      setRegistries(fallbackRegistries);
    }
  }

  async function refreshHistory() {
    try {
      setHistory(await getAiPlaygroundHistory());
    } catch {
      setHistory([]);
    }
  }

  async function handleExecute() {
    setError(null);
    setIsExecuting(true);
    setActiveStateIndex(0);

    try {
      const requestId = `playground-ui-${Date.now()}`;
      const response = await executeAiPlaygroundRequest({
        capabilityId: capability,
        conversationId: conversation,
        correlationId: `${requestId}:correlation`,
        input: requestText,
        projectIds: project ? [project] : [],
        providerId: provider,
        requestId,
        sessionId: `${requestId}:session`,
      });
      setTrace(response.trace);
      setActiveStateIndex(executionStates.length - 1);
      await refreshHistory();
      await refreshRegistries();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to execute playground request",
      );
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleReplay() {
    if (!trace) {
      return;
    }

    setError(null);
    setIsExecuting(true);
    setActiveStateIndex(0);

    try {
      const response = await replayAiPlaygroundExecution(trace.executionId);
      setTrace(response.trace);
      setRequestText(String(response.trace.input ?? requestText));
      setActiveStateIndex(executionStates.length - 1);
      await refreshHistory();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to replay playground execution",
      );
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleSelectHistory(executionId: string) {
    setError(null);
    try {
      setTrace(await getAiPlaygroundTrace(executionId));
      setActiveStateIndex(executionStates.length - 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load execution trace",
      );
    }
  }

  const selectedProvider =
    typeof trace?.selectedProvider?.id === "string"
      ? trace.selectedProvider.id
      : provider;
  const duration =
    typeof trace?.timing.durationMs === "number"
      ? `${trace.timing.durationMs} ms`
      : "Pending";
  const statusText =
    typeof trace?.finalResult.status === "string"
      ? trace.finalResult.status
      : isExecuting
        ? "running"
        : "idle";
  const responseContent =
    typeof trace?.finalResult.mockResponse === "object" &&
    trace.finalResult.mockResponse !== null &&
    "content" in trace.finalResult.mockResponse
      ? String(trace.finalResult.mockResponse.content)
      : "No response yet";

  return (
    <div className="space-y-5 text-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Internal admin tool
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">
            AI Playground
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
            disabled={!trace || isExecuting}
            onClick={handleReplay}
            type="button"
          >
            Replay
          </button>
          <button
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-50"
            disabled={isExecuting}
            onClick={handleExecute}
            type="button"
          >
            {isExecuting ? "Executing" : "Execute"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 lg:grid-cols-4">
        <SelectField
          label="Capability"
          onChange={setCapability}
          options={registries.capabilities}
          value={capability}
        />
        <SelectField
          label="Conversation"
          onChange={setConversation}
          options={registries.conversations}
          value={conversation}
        />
        <SelectField
          label="Provider"
          onChange={setProvider}
          options={registries.providers}
          value={provider}
        />
        <label className="space-y-1 text-sm font-medium">
          <span>Project</span>
          <input
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            onChange={(event) => setProject(event.target.value)}
            value={project}
          />
        </label>
        <label className="space-y-1 text-sm font-medium lg:col-span-4">
          <span>User Request</span>
          <textarea
            className="min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onChange={(event) => setRequestText(event.target.value)}
            value={requestText}
          />
        </label>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Execution Timeline</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              {statusText}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {executionStates.map((state, index) => (
              <div
                className={`rounded-md border p-3 ${
                  index <= activeStateIndex
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
                key={state}
              >
                <p className="text-xs text-slate-500">
                  {(index + 1).toString().padStart(2, "0")}
                </p>
                <p className="mt-1 text-sm font-semibold">{state}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Execution Result</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <ResultItem label="Provider" value={selectedProvider} />
            <ResultItem label="Capability" value={capability} />
            <ResultItem label="Conversation" value={conversation} />
            <ResultItem
              label="Execution ID"
              value={trace?.executionId ?? "-"}
            />
            <ResultItem label="Duration" value={duration} />
            <ResultItem label="Status" value={statusText} />
          </dl>
          <div className="mt-4 rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Request
            </p>
            <p className="mt-1 text-sm text-slate-800">{requestText}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Response
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {responseContent}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {(
              ["request", "response", "trace", "diagnostics", "events"] as const
            ).map((tab) => (
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeTab === tab
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
          <pre className="mt-3 max-h-[28rem] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(jsonPayload, null, 2)}
          </pre>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Event Timeline</h2>
          <div className="mt-3 space-y-2">
            {(trace?.eventTimeline ?? []).map((event, index) => (
              <div
                className="grid gap-1 rounded-md bg-slate-50 p-3 text-sm"
                key={`${event.eventName}-${index}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{event.eventName}</span>
                  <span className="text-xs text-slate-500">
                    {event.durationMs ?? 0} ms
                  </span>
                </div>
                <p className="text-xs text-slate-500">{event.timestamp}</p>
                <p className="truncate text-xs text-slate-500">
                  {event.executionId}
                </p>
              </div>
            ))}
            {!trace ? (
              <p className="text-sm text-slate-500">No events yet.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Execution History</h2>
          <div className="mt-3 space-y-2">
            {history.map((item) => (
              <button
                className="grid w-full gap-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-left text-sm hover:border-slate-400"
                key={item.executionId}
                onClick={() => handleSelectHistory(item.executionId)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.executionId}</span>
                  <span>{item.status}</span>
                </div>
                <p className="truncate text-slate-600">{item.request}</p>
                <p className="text-xs text-slate-500">
                  {item.capability} / {item.provider ?? "mock"} /{" "}
                  {item.durationMs ?? 0} ms
                </p>
              </button>
            ))}
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">
                No execution history yet.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Registry Inspector</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(registries).map(([name, values]) => (
              <div className="rounded-md bg-slate-50 p-3" key={name}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {name}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-800">
                  {values.map((value, index) => (
                    <li key={`${name}-${index}`}>{String(value.id ?? "-")}</li>
                  ))}
                  {values.length === 0 ? <li>-</li> : null}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<Record<string, unknown>>;
  value: string;
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      <span>{label}</span>
      <select
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((item, index) => {
          const id = String(item.id ?? index);

          return <option key={id}>{id}</option>;
        })}
      </select>
    </label>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
