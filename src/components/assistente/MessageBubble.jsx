import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react";

function parseResults(results) {
  if (!results) return null;
  if (typeof results === "string") {
    try {
      return JSON.parse(results);
    } catch {
      return results;
    }
  }
  return results;
}

function isFailed(toolCall, parsedResults) {
  if (toolCall.status === "failed" || toolCall.status === "error") return true;
  if (typeof parsedResults === "string" && /error|failed/i.test(parsedResults)) return true;
  if (parsedResults && typeof parsedResults === "object" && parsedResults.success === false) return true;
  return false;
}

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const parsedResults = parseResults(toolCall.results);
  const failed = isFailed(toolCall, parsedResults);
  const running = ["pending", "running", "in_progress"].includes(toolCall.status);

  let icon = <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
  if (running) icon = <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />;
  else if (failed) icon = <XCircle className="w-3.5 h-3.5 text-red-600" />;

  const label = failed
    ? toolCall.display_projection?.error_label
    : running
    ? toolCall.display_projection?.active_label
    : toolCall.display_projection?.label;

  const hideDetails = toolCall.display_projection?.hide_details && toolCall.display_projection?.details_redacted;

  return (
    <div className="mt-1.5 text-xs border rounded-md bg-muted/40">
      <button
        onClick={() => !hideDetails && setExpanded((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left"
      >
        <Wrench className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate text-muted-foreground">{label || toolCall.name}</span>
        {icon}
        {!hideDetails && (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
      </button>
      {expanded && !hideDetails && (
        <div className="px-2 pb-2 space-y-1.5">
          <div>
            <p className="font-medium text-muted-foreground">Parâmetros:</p>
            <pre className="bg-background border rounded p-1.5 overflow-auto text-[10px] whitespace-pre-wrap">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                } catch {
                  return toolCall.arguments_string;
                }
              })()}
            </pre>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Resultado:</p>
            <pre className="bg-background border rounded p-1.5 overflow-auto text-[10px] whitespace-pre-wrap">
              {typeof parsedResults === "string" ? parsedResults : JSON.stringify(parsedResults, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? "" : "w-full"}`}>
        {message.content && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm ${
              isUser ? "bg-primary text-primary-foreground" : "bg-card border"
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.map((tc, i) => <FunctionDisplay key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}