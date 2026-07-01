export type YesNo = "Y" | "N";

export type ReviewRow = {
  ticketLink: string;
  reviewLink: string;
  modelNumber: string;
  verifiedFiveStar: YesNo;
  containsVideo: YesNo;
  containsPictures: YesNo;
  customerContactTicketLink: string;
  replacementSent: string;
  platform: string;
  // Legacy Amazon-only flag retained for existing parser checks. The spreadsheet
  // verifiedFiveStar value is the source of truth for bonuses and exports.
  amazonVerifiedPurchase: boolean;
  ticketNumber?: string;
  customerName?: string;
  reviewDateOrStatus?: string;
  ratingOrStatus?: string;
  reviewText?: string;
  flags: string[];
};

export type FlagItem = {
  rowNumber: number;
  platform: string;
  message: string;
};

export const REVIEW_COLUMNS = [
  { key: "ticketLink", label: "Ticket Link" },
  { key: "reviewLink", label: "Link to review" },
  { key: "modelNumber", label: "Model Number" },
  { key: "verifiedFiveStar", label: "Verified 5 star?" },
  { key: "containsVideo", label: "Contains video?" },
  { key: "containsPictures", label: "Contains pictures?" },
  { key: "customerContactTicketLink", label: "Customer contact/Ticket link" },
  { key: "replacementSent", label: "Replacement sent" },
] as const;

export type ReviewColumnKey = (typeof REVIEW_COLUMNS)[number]["key"];

export type KpiReportRow = {
  top3Achievements: string;
  threeBestTickets: string;
  worstTicket1: string;
  worstTicket2: string;
  worstTicket3: string;
};

export const KPI_COLUMNS = [
  { key: "top3Achievements", label: "Top 3 Achievements" },
  { key: "threeBestTickets", label: "3 Best Tickets" },
  { key: "worstTicket1", label: "#1 of 3 Worst Tickets" },
  { key: "worstTicket2", label: "#2 of 3 Worst Tickets" },
  { key: "worstTicket3", label: "#3 of 3 Worst Tickets" },
] as const;

export type KpiColumnKey = (typeof KPI_COLUMNS)[number]["key"];

export const REVIEW_PROMISE_PLATFORMS = [
  "Google",
  "Amazon",
  "Trustpilot",
  "iSpring",
  "Costco",
  "Costco.ca",
  "Home Depot",
  "Home Depot Canada",
  "Zoro",
  "Walmart",
  "Lowe's",
  "Other",
] as const;

export type ReviewPromisePlatform = (typeof REVIEW_PROMISE_PLATFORMS)[number];

export const REVIEW_PROMISE_STATUSES = ["Promised", "Followed Up", "Converted", "Closed"] as const;

export type ReviewPromiseStatus = (typeof REVIEW_PROMISE_STATUSES)[number];

export type ReviewPromiseEntry = {
  id: string;
  createdAt: string;
  customerName: string;
  platform: ReviewPromisePlatform;
  ticketNumber?: string;
  ticketLink?: string;
  modelNumber?: string;
  promiseNote?: string;
  followUpDate?: string;
  status: ReviewPromiseStatus;
};
