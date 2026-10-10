# Aster451Profile

**Automated GitHub Profile Graphics Generator for Aster451Template**

Aster451Profile is a TypeScript-based project that generates SVG graphics for the Aster451Template GitHub organization profile.

Using [Satori](https://github.com/vercel/satori), the project converts structured UI elements into SVG, enabling customizable, programmatically generated profile graphics.

## Features

- **SVG Generation:** Generate profile graphics in SVG format.
- **Custom Typography:** Use custom fonts, including Zen Old Mincho.
- **TypeScript:** Build and maintain the generator with TypeScript.
- **Automation:** Run the generation process locally or through GitHub Actions.
- **Version Control:** Keep generated graphics synchronized with the repository.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| TypeScript | Application logic |
| [Satori](https://github.com/vercel/satori) | SVG generation from UI elements |
| [tsx](https://github.com/privatenumber/tsx) | Execute TypeScript files |
| npm | Dependency management |
| GitHub Actions | Automated generation |

## Project Structure

```text
.
├── asset/
│   └── ZenOldMincho-Regular.ttf
├── dist/
│   └── overview.svg
├── profile/
│   └── README.md
├── src/
│   └── card.tsx
├── .github/
│   └── workflows/
│       └── generate.yml
├── package.json
├── package-lock.json
└── tsconfig.json
```

The exact contents may vary as the project evolves.

## Getting Started

### Requirements

- Node.js
- npm

### Installation

Clone the repository and install its dependencies.

```bash
git clone https://github.com/Aster451Template/.github.git
cd Aster451Profile
npm ci
```

### Generate SVG Graphics

Run the generation script:

```bash
npm run generate
```

The generated profile graphic is written to:

```text
dist/overview.svg
```

The command above assumes that `package.json` defines the `generate` script.

## GitHub Actions

The project can use GitHub Actions to automate SVG generation.

A workflow can be configured to run when changes are pushed, on a schedule, or manually through the GitHub Actions interface.

A typical workflow performs the following steps:

1. Check out the repository.
2. Set up Node.js.
3. Install dependencies with `npm ci`.
4. Run `npm run generate`.
5. Commit updated SVG files when necessary.

To allow a workflow to commit generated files, configure the appropriate repository permissions.

## Customization

### Typography

Custom fonts can be stored in the `asset/` directory.

For example:

```text
asset/
└── ZenOldMincho-Regular.ttf
```

Satori requires font data to be registered when rendering text with custom fonts. Font configuration should be maintained in the SVG generation source.

### Profile Graphics

Modify the TypeScript source in `src/` to customize the layout, typography, colors, and displayed information.

Generated SVG files are placed in `dist/`.

## Usage

Generated graphics can be embedded in a GitHub README using Markdown:

```md
![Aster451 Profile Overview](../dist/overview.svg)
```

Adjust the relative path according to the location of the README.

## License

See the `LICENSE` file in this repository for licensing terms.

---

Part of the Aster451Template ecosystem.

**Accessible Styling & Techniques for Expressive Representation - 451 Standard**
