import { useState } from "react";

type MobileView = "mailboxes" | "emails" | "detail";

export function useResponsiveView() {
  const [mobileView, setMobileView] = useState<MobileView>("mailboxes");

  const navigateToEmails = () => {
    setMobileView("emails");
  };

  const navigateToDetail = () => {
    setMobileView("detail");
  };

  const navigateToMailboxes = () => {
    setMobileView("mailboxes");
  };

  return {
    mobileView,
    navigateToEmails,
    navigateToDetail,
    navigateToMailboxes,
  };
}
