import { useState } from "react";

type ComposeMode = "compose" | "reply" | "forward" | null;

export function useEmailActions() {
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [replyToEmailId, setReplyToEmailId] = useState<string | null>(null);
  const [forwardEmailId, setForwardEmailId] = useState<string | null>(null);

  const handleCompose = () => {
    setComposeMode("compose");
    setReplyToEmailId(null);
    setForwardEmailId(null);
  };

  const handleReply = (emailId: string) => {
    setReplyToEmailId(emailId);
    setComposeMode("reply");
  };

  const handleForward = (emailId: string) => {
    setForwardEmailId(emailId);
    setComposeMode("forward");
  };

  const handleCloseCompose = () => {
    setComposeMode(null);
    setReplyToEmailId(null);
    setForwardEmailId(null);
  };

  return {
    composeMode,
    replyToEmailId,
    forwardEmailId,
    handleCompose,
    handleReply,
    handleForward,
    handleCloseCompose,
  };
}
