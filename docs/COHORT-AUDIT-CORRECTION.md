# Cohort audit arithmetic correction

The histogram released in digitalocean-v81 counted only 501,874 of the
1,000,000 synthetic units in its public array. JavaScript's remainder operator
returned negative indices for sufficiently negative bucket differences.
Those observations became array properties excluded from the JSON certificate.

The corrected expression normalizes the remainder into 0 through 15:

```js
((candidateBucket - previousBucket) % 16 + 16) % 16
```

Both the internal and downloadable auditors now require histogram counts to
sum to 1,000,000. Regression checks also reject unexpected array properties.

Corrected counts:

```text
[0,124993,0,124827,0,124884,0,125282,
 0,125135,0,124649,0,125596,0,124634]
```

The odd-only residue pattern and zero exact bucket matches remain reproducible.
The previous histogram and its certificate digests must not be used as complete
population evidence.

- Corrected diagnostics SHA-256:
  `dd2085d643ee6887b88c757997d71331b04645268924a4df31448cd9c217db71`
- Corrected certificate SHA-256:
  `6f47094fe44c68bac6db9181aba1786ce5f1f33a99cb3b0f0c73043dbbdbc2a7`

The hold is an advisory result of this synthetic review. This correction does
not establish a deployment enforcement mechanism or prove real-user bias.
