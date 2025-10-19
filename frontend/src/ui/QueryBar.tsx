import { FormEvent, useState } from "react";
import { useAppState } from "../state/store";
import { Button } from "./Button";

const cannedResponses = [
  "Telemetry queued. Highlighting requested subset.",
  "Intent parsed: applying radial filters to the cloud.",
  "Roger that. Updating deck overlays with new selection.",
];

export function QueryBar() {
  const [prompt, setPrompt] = useState("");
  const appendQuery = useAppState((s) => s.appendQuery);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    const response = cannedResponses[Math.floor(Math.random() * cannedResponses.length)];
    appendQuery(prompt.trim(), response);
    setPrompt("");
  };

  return (
    <div className="chat-dock">
      <QueryTranscript />
      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          rows={2}
          placeholder="e.g. show me mines in 2023"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <Button type="submit" variant="solid" size="sm" className="chat-send">
          Transmit
        </Button>
      </form>
    </div>
  );
}

function QueryTranscript() {
  const log = useAppState((s) => s.queryLog);
  if (!log.length) return null;

  return (
    <div className="chat-log">
      {log.slice(-4).map((entry) => (
        <div key={entry.id} className="chat-log-entry">
          <div className="chat-log-prompt">{entry.prompt}</div>
          <div className="chat-log-response">{entry.response}</div>
          <div className="chat-log-meta">{entry.at.toLocaleTimeString()}</div>
        </div>
      ))}
    </div>
  );
}
