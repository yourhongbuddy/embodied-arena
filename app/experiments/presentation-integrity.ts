export const EXPERIMENT_PRESENTATION_PROFILE = "0.21-RP2";
export const EXPERIMENT_PRESENTATION_NORMALIZATION = "utf8_lf";

export const EXPERIMENT_PRESENTATION_SOURCES = [
  { path: "app/globals.css", sha256: "93205761abba90cd22d8f64033653baee4a384d98b07ca44f54c998c2ccfcfc0" },
  { path: "app/components/SiteNav.tsx", sha256: "704284f78d19efb894586e735c9299a1a505aa3ea8f0c6c4f86e6bff8dbeb067" },
  { path: "app/wanted-10k/layout.tsx", sha256: "cc858adf1b49d9e92937cd7bd1f02ee6065d55be36b3cfee2a7a2326935c7966" },
  { path: "app/wanted-10k/page.tsx", sha256: "4ca997672be0548816ac18dfc69066f289069de362bd8185dfcd48cc75939fdd" },
  { path: "app/wanted-10k/WantedLandingExperience.tsx", sha256: "a997e5c78b3213365d26074b35fd75a61a67ee79cffd425c8de78704b73b3029" },
  { path: "app/wanted-10k/wanted.css", sha256: "f947c14360eaeef74634decb5542f9889016e81ce6f3cc6422ee062115138487" },
] as const;

export const EXPERIMENT_PRESENTATION_IDENTITY = {
  profile: EXPERIMENT_PRESENTATION_PROFILE,
  normalization: EXPERIMENT_PRESENTATION_NORMALIZATION,
  sources: EXPERIMENT_PRESENTATION_SOURCES,
} as const;

export const EXPERIMENT_PRESENTATION_FINGERPRINT = "sha256:ec2cd6dd9db4fcbaeb38bf939a982340ccbdc17e46ce7d88aea963e99b3dd89e";
