# Third-Party Licenses

Aster451Profile incorporates or uses third-party software and font assets. These components remain subject to their respective licenses. The license for Aster451Profile's own code does not replace or override the licenses of third-party components.

## 1. Satori

- **Component:** Satori
- **Version:** 0.47.1
- **License:** Mozilla Public License 2.0 (MPL-2.0)
- **Copyright:** Copyright © Satori contributors and respective copyright holders
- **Source:** <https://github.com/vercel/satori>
- **License text:** <https://github.com/vercel/satori/blob/main/LICENSE>

Satori is used to render the JSX-based organization profile into SVG.

Satori is distributed under the Mozilla Public License 2.0. Refer to the original license for the applicable conditions concerning modification, distribution, and source-code availability.

## 2. Primer Octicons

- **Component:** Primer Octicons
- **License:** MIT License
- **Copyright:** Copyright © GitHub, Inc.
- **Source:** <https://github.com/primer/octicons>
- **License text:** <https://github.com/primer/octicons/blob/main/LICENSE>

Aster451Profile uses SVG path data derived from the following Octicons:

- `repo-16`
- `star-16`
- `code-square-16`
- `git-commit-16`
- `people-16`
- `graph-16`

The icon path data is used in the `octiconPaths` object in `src/card.tsx`.

The original icon names and source URLs are documented in the source code. The relevant copyright and license notices should be retained when redistributing the applicable material.

## 3. Zen Old Mincho

- **Component:** Zen Old Mincho
- **Asset:** `asset/ZenOldMincho-Regular.ttf`
- **License:** SIL Open Font License 1.1 (OFL-1.1)
- **Copyright:** Copyright 2021 The Zen Old Mincho Project Authors
- **Source:** <https://github.com/googlefonts/zen-oldmincho>
- **License text:** <https://github.com/googlefonts/zen-oldmincho/blob/main/OFL.txt>

Zen Old Mincho is used as the font for the generated SVG.

The font is distributed under the SIL Open Font License 1.1. Its redistribution must comply with the terms of that license. The complete OFL license text should accompany the redistributed font asset.

## 4. TypeScript

- **Component:** TypeScript
- **Version:** 7.0.2
- **License:** Apache License 2.0 (Apache-2.0)
- **Source:** <https://github.com/microsoft/TypeScript>
- **License text:** <https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt>

TypeScript is used for the project's development and type checking.

## 5. tsx

- **Component:** tsx
- **Version:** 4.23.15
- **License:** MIT License
- **Source:** <https://github.com/privatenumber/tsx>

tsx is used to execute the TypeScript/TSX entry point through the `generate` npm script.

## 6. @types/node

- **Component:** @types/node
- **Version:** 26.6.5
- **License:** MIT License
- **Source:** <https://github.com/DefinitelyTyped/DefinitelyTyped>

This package provides TypeScript definitions for Node.js APIs used by the project.

## 7. Other Dependencies

Aster451Profile also relies on transitive dependencies installed through npm. Examples include:

- `@shuding/opentype.js` — MIT License
- `esbuild` — MIT License
- `css-color-keywords` — ISC License
- `@typescript/*` platform-specific packages — Apache License 2.0, as declared in the supplied lockfile

Other direct and transitive dependencies may have their own copyright notices and license conditions.

The complete list of installed dependencies and their declared license identifiers is recorded in `package-lock.json`. Each dependency's published license should be checked against the exact installed version.

## 8. GitHub API

- **Service:** GitHub REST API
- **Documentation:** <https://docs.github.com/en/rest>

Aster451Profile retrieves public organization, repository, programming-language, commit, and public-member information from the GitHub REST API.

The API is a service used by this project, not a bundled software dependency. Its use is subject to the applicable GitHub terms and policies.

## 9. License and Attribution Notes

- Third-party components retain their respective licenses.
- The license selected for Aster451Profile's own source code does not relicense third-party components.
- Copyright notices and required license texts should be preserved when redistributing third-party assets.
- This document summarizes third-party components and is not a substitute for their complete license texts.
- The exact versions and license declarations in `package-lock.json` should be used as the reference for dependency auditing.
