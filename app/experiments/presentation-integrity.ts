export const EXPERIMENT_PRESENTATION_PROFILE = "0.20-RP1";
export const EXPERIMENT_PRESENTATION_NORMALIZATION = "utf8_lf";

export const EXPERIMENT_PRESENTATION_SOURCES = [
  { path: "app/globals.css", sha256: "93205761abba90cd22d8f64033653baee4a384d98b07ca44f54c998c2ccfcfc0" },
  { path: "app/components/SiteNav.tsx", sha256: "704284f78d19efb894586e735c9299a1a505aa3ea8f0c6c4f86e6bff8dbeb067" },
  { path: "app/wanted-10k/layout.tsx", sha256: "cc858adf1b49d9e92937cd7bd1f02ee6065d55be36b3cfee2a7a2326935c7966" },
  { path: "app/wanted-10k/page.tsx", sha256: "4ca997672be0548816ac18dfc69066f289069de362bd8185dfcd48cc75939fdd" },
  { path: "app/wanted-10k/WantedLandingExperience.tsx", sha256: "feafbfb95eac2bb4c37b1f3c23574847052daeb92bcc58f17cd6da68c3c4b326" },
  { path: "app/wanted-10k/wanted.css", sha256: "f947c14360eaeef74634decb5542f9889016e81ce6f3cc6422ee062115138487" },
] as const;

export const EXPERIMENT_PRESENTATION_IDENTITY = {
  profile: EXPERIMENT_PRESENTATION_PROFILE,
  normalization: EXPERIMENT_PRESENTATION_NORMALIZATION,
  sources: EXPERIMENT_PRESENTATION_SOURCES,
} as const;

export const EXPERIMENT_PRESENTATION_FINGERPRINT = "sha256:6d354ed9c81529f171333f9112158b39fc2e868789abd37ce08c77d33bc863cd";
