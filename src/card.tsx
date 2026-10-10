/** @jsxImportSource satori/jsx */

import satori from "satori";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type GitHubRepo = {
	name: string;
	full_name: string;
	html_url: string;
	description: string | null;
	stargazers_count: number;
	fork: boolean;
	archived: boolean;
	language: string | null;
	updated_at: string;
};

type GitHubOrg = {
	login: string;
	name: string | null;
	description: string | null;
	created_at: string;
	html_url: string;
};

// Configuration: change only the organization name for a different profile.
const ORGANIZATION_NAME = "Aster451Template";

// Number of days used for the commit count.
const COMMIT_WINDOW_DAYS = 90;

const colors = {
	midnightIndigo: "#29274c",
	asterViolet: "#7e52a0",
	dustyLilac: "#94849B",
	paperWhite: "#f1f1f1",
	forestInk: "#091e05",
	mistBlue: "#DBE4EE",
	lightAsh: "#CDCDCD",
	moss: "#2f6b3a",
	amberBrown: "#8a5a00",
	garnet: "#9b2c3c",
	white: "#ffffff",
};

// GitHub (linguist) language colors. Unknown languages fall back to a neutral gray.
const githubLanguageColors: Record<string, string> = {
	"1C Enterprise": "#814CCC",
	Astro: "#ff5a03",
	Batchfile: "#C1F12E",
	C: "#555555",
	"C#": "#178600",
	"C++": "#f34b7d",
	CMake: "#DA3434",
	CoffeeScript: "#244776",
	CSS: "#663399",
	Dart: "#00B4AB",
	Dockerfile: "#384d54",
	EJS: "#a91e50",
	Elixir: "#6e4a7e",
	Elm: "#60B5CC",
	GLSL: "#5686a5",
	Go: "#00ADD8",
	Groovy: "#4298b8",
	Handlebars: "#f7931e",
	Haskell: "#5e5086",
	HCL: "#844FBA",
	HTML: "#e34c26",
	Java: "#b07219",
	JavaScript: "#f1e05a",
	Jinja: "#a52a22",
	"Jupyter Notebook": "#DA5B0B",
	Kotlin: "#A97BFF",
	Less: "#1d365d",
	Lua: "#000080",
	Makefile: "#427819",
	Markdown: "#083fa1",
	MDX: "#fcb32c",
	Nix: "#7e7eff",
	Nunjucks: "#3d8137",
	"Objective-C": "#438eff",
	Perl: "#0298c3",
	PHP: "#4F5D95",
	PowerShell: "#012456",
	Pug: "#a86454",
	Python: "#3572A5",
	R: "#198CE7",
	Roff: "#ecdebe",
	Ruby: "#701516",
	Rust: "#dea584",
	Sass: "#a53b70",
	Scala: "#c22d40",
	SCSS: "#c6538c",
	Shell: "#89e051",
	Svelte: "#ff3e00",
	Swift: "#F05138",
	TeX: "#3D6117",
	TypeScript: "#3178c6",
	"Vim Script": "#199f4b",
	Vue: "#41b883",
	WebAssembly: "#04133b",
	YAML: "#cb171e",
	Zig: "#ec915c",
};

const FALLBACK_LANGUAGE_COLOR = "#8b949e";

function getLanguageColor(name: string) {
	return githubLanguageColors[name] ?? FALLBACK_LANGUAGE_COLOR;
}

const API_BASE = "https://api.github.com";

async function githubFetch(url: string): Promise<Response> {
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "Aster451-Organization-Profile",
	};

	// Optional: set GITHUB_TOKEN in the environment to raise the API rate limit.
	// No token is required for public organization data.
	if (process.env.GITHUB_TOKEN) {
		headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
	}

	const response = await fetch(url, { headers });
	if (!response.ok) {
		const detail = await response.text();
		throw new Error(`GitHub API ${response.status} (${url}): ${detail.slice(0, 240)}`);
	}
	return response;
}

async function githubGet<T>(url: string): Promise<T> {
	const response = await githubFetch(url);
	return response.json() as Promise<T>;
}

// Counts items of a list endpoint with a single request:
// per_page=1 makes the "last" page number in the Link header equal to the item count.
async function countItems(url: string): Promise<number> {
	const response = await githubFetch(url);
	const items = (await response.json()) as unknown[];
	const lastPage = response.headers.get("link")?.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/);
	return lastPage ? Number(lastPage[1]) : items.length;
}

// Small batches avoid flooding the unauthenticated API.
async function mapInBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = [];
	for (let i = 0; i < items.length; i += size) {
		results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
	}
	return results;
}

async function getRepositories(orgName: string): Promise<GitHubRepo[]> {
	const repositories: GitHubRepo[] = [];
	for (let page = 1; ; page += 1) {
		const batch = await githubGet<GitHubRepo[]>(
			`${API_BASE}/orgs/${encodeURIComponent(orgName)}/repos?type=public&per_page=100&page=${page}&sort=updated`,
		);
		repositories.push(...batch);
		if (batch.length < 100) break;
	}
	return repositories;
}

async function getLanguageStats(repositories: GitHubRepo[]) {
	const totals = new Map<string, number>();
	const results = await mapInBatches(repositories, 8, async (repo) => {
		try {
			return await githubGet<Record<string, number>>(
				`${API_BASE}/repos/${encodeURIComponent(repo.full_name.split("/")[0])}/${encodeURIComponent(repo.name)}/languages`,
			);
		} catch (error) {
			console.warn(`Could not load languages for ${repo.full_name}:`, error);
			return {} as Record<string, number>;
		}
	});
	for (const languageMap of results) {
		for (const [language, bytes] of Object.entries(languageMap)) {
			totals.set(language, (totals.get(language) ?? 0) + bytes);
		}
	}

	const totalBytes = [...totals.values()].reduce((sum, value) => sum + value, 0);
	const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
	const topLanguages = sorted.slice(0, 7).map(([name, bytes]) => ({
		name,
		bytes,
		percent: totalBytes ? (bytes / totalBytes) * 100 : 0,
		color: getLanguageColor(name),
	}));
	const otherBytes = sorted.slice(7).reduce((sum, [, bytes]) => sum + bytes, 0);
	if (otherBytes > 0 && totalBytes > 0) {
		topLanguages.push({
			name: "Other",
			bytes: otherBytes,
			percent: (otherBytes / totalBytes) * 100,
			color: colors.lightAsh,
		});
	}
	return topLanguages;
}

// Commits on the default branch of each non-fork repository during the last N days.
// Forks are skipped because their history includes the upstream project's commits.
async function getRecentCommitCount(repositories: GitHubRepo[], days: number): Promise<number> {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
	const counts = await mapInBatches(
		repositories.filter((repo) => !repo.fork),
		8,
		async (repo) => {
			try {
				return await countItems(
					`${API_BASE}/repos/${repo.full_name}/commits?since=${encodeURIComponent(since)}&per_page=1`,
				);
			} catch (error) {
				// Empty repositories answer 409; treat them (and other failures) as zero.
				console.warn(`Could not load commits for ${repo.full_name}:`, error);
				return 0;
			}
		},
	);
	return counts.reduce((sum, count) => sum + count, 0);
}

// Only public members are visible without special permissions.
async function getMemberCount(orgName: string): Promise<number> {
	try {
		return await countItems(`${API_BASE}/orgs/${encodeURIComponent(orgName)}/public_members?per_page=1`);
	} catch (error) {
		console.warn("Could not load members:", error);
		return 0;
	}
}

// Top 3 by stars; ties are broken by the most recently updated repository.
function getTopRepositories(repositories: GitHubRepo[]) {
	return repositories
		.filter((repo) => !repo.fork && !repo.archived)
		.sort(
			(a, b) =>
				b.stargazers_count - a.stargazers_count || Date.parse(b.updated_at) - Date.parse(a.updated_at),
		)
		.slice(0, 3);
}

function formatNumber(value: number) {
	return new Intl.NumberFormat("en-US").format(value);
}

// YYYY-MM-DD (UTC), independent of the machine's locale and time zone.
function formatDate(iso: string) {
	return new Date(iso).toISOString().slice(0, 10);
}

// YYYY-MM-DD HH:mm UTC
function formatDateTime(date: Date) {
	return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function truncate(text: string, max: number) {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

type OcticonKind = "repo" | "star" | "code" | "commit" | "people" | "graph";

const octiconPaths: Record<OcticonKind, string> = {
	// https://primer.style/octicons/icon/repo-16/
	repo: "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z",
	// https://primer.style/octicons/icon/star-16/
	star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.193a.75.75 0 0 1-1.088.79L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.719-4.193-3.046-2.97a.75.75 0 0 1 .416-1.279l4.21-.612L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z",
	// https://primer.style/octicons/icon/code-square-16/
	code: "M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25Zm7.47 3.97a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L10.69 8 9.22 6.53a.75.75 0 0 1 0-1.06ZM6.78 6.53 5.31 8l1.47 1.47a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215l-2-2a.75.75 0 0 1 0-1.06l2-2a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z",
	// https://primer.style/octicons/icon/git-commit-16/
	commit: "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
	// https://primer.style/octicons/icon/people-16/
	people: "M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z",
	// https://primer.style/octicons/icon/graph-16/
	graph: "M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z",
};

function Octicon({ kind, size = 24, color = colors.asterViolet }: { kind: OcticonKind; size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
			<path d={octiconPaths[kind]} />
		</svg>
	);
}

function SectionTitle({ title, icon }: { title: string; icon?: OcticonKind }) {
	return (
		<div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px" }}>
			<div style={{ width: "5px", height: "30px", backgroundColor: colors.asterViolet }} />
			{icon ? <Octicon kind={icon} size={26} /> : null}
			<div style={{ fontSize: "28px", color: colors.midnightIndigo }}>{title}</div>
		</div>
	);
}

type Stat = { label: string; value: string; icon: OcticonKind };

function StatCard({ stat }: { stat: Stat }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				flex: 1,
				minWidth: 0,
				padding: "18px 20px",
				backgroundColor: colors.white,
				border: `1px solid ${colors.lightAsh}`,
				borderRadius: "8px",
				gap: "10px",
			}}
		>
			<div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
				<Octicon kind={stat.icon} size={26} />
				<div style={{ fontSize: "15px", color: colors.dustyLilac }}>{stat.label}</div>
			</div>
			<div style={{ fontSize: "38px", lineHeight: 1.1, color: colors.midnightIndigo }}>{stat.value}</div>
		</div>
	);
}

async function main() {
	const generatedAt = new Date();
	const fontPath = path.resolve("asset", "ZenOldMincho-Regular.ttf");
	const font = await readFile(fontPath);

	const org = await githubGet<GitHubOrg>(`${API_BASE}/orgs/${encodeURIComponent(ORGANIZATION_NAME)}`);
	const repositories = await getRepositories(ORGANIZATION_NAME);
	const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
	const languages = await getLanguageStats(repositories);
	const languageTotal = languages.reduce((sum, language) => sum + language.bytes, 0);
	const recentCommits = await getRecentCommitCount(repositories, COMMIT_WINDOW_DAYS);
	const memberCount = await getMemberCount(ORGANIZATION_NAME);
	const topRepositories = getTopRepositories(repositories);
	const established = new Date(org.created_at).getFullYear().toString();
	const description = org.description || "The happiness of one person leads to the happiness of many.";

	const primaryStats: Stat[] = [
		{ label: "PUBLIC REPOSITORIES", value: formatNumber(repositories.length), icon: "repo" },
		{ label: "STARS", value: formatNumber(totalStars), icon: "star" },
		{ label: "LANGUAGES", value: formatNumber(languages.length), icon: "code" },
	];
	const activityStats: Stat[] = [
		{ label: `COMMITS · ${COMMIT_WINDOW_DAYS} DAYS`, value: formatNumber(recentCommits), icon: "commit" },
		{ label: "PUBLIC MEMBERS", value: formatNumber(memberCount), icon: "people" },
	];

	const svg = await satori(
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				boxSizing: "border-box",
				padding: "40px",
				gap: "26px",
				overflow: "hidden",
				backgroundColor: colors.paperWhite,
				color: colors.forestInk,
				fontFamily: "Zen Old Mincho",
			}}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					padding: "0 0 24px 0",
					borderBottom: `2px solid ${colors.lightAsh}`,
					gap: "14px",
				}}
			>
				<div style={{ fontSize: "52px", lineHeight: 1.15, color: colors.midnightIndigo }}>
					{org.name || org.login}
				</div>
				<div style={{ fontSize: "20px", lineHeight: 1.4, color: colors.dustyLilac }}>
					Accessible Styling &amp; Techniques for Expressive Representation - 451 Standard
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						alignSelf: "flex-start",
						padding: "10px 16px",
						backgroundColor: colors.mistBlue,
						borderLeft: `4px solid ${colors.asterViolet}`,
						gap: "14px",
					}}
				>
					<div style={{ fontSize: "14px", color: colors.midnightIndigo, letterSpacing: "1px" }}>GITHUB ORGANIZATION</div>
					<div style={{ fontSize: "18px", color: colors.asterViolet }}>{`github.com/${org.login}`}</div>
				</div>
			</div>

			{/* Introduction */}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: "20px",
					padding: "22px 24px",
					backgroundColor: colors.white,
					border: `1px solid ${colors.lightAsh}`,
					borderLeft: `5px solid ${colors.asterViolet}`,
					borderRadius: "8px",
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "10px", minWidth: 0 }}>
					<div style={{ fontSize: "28px", color: colors.midnightIndigo }}>About {org.name || org.login}</div>
					<div style={{ fontSize: "20px", lineHeight: 1.5, color: colors.forestInk }}>{description}</div>
					<div style={{ fontSize: "17px", lineHeight: 1.5, color: colors.dustyLilac }}>
						Aster451 is a project dedicated to accessible styling, expressive representation, and thoughtful web design. We respect individual needs for readability and strive to create digital experiences that are accessible, maintainable, and enjoyable to use.
					</div>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-end",
						gap: "6px",
						paddingLeft: "20px",
						borderLeft: `1px solid ${colors.lightAsh}`,
						flexShrink: 0,
					}}
				>
					<div style={{ fontSize: "14px", color: colors.dustyLilac }}>ESTABLISHED</div>
					<div style={{ fontSize: "36px", color: colors.midnightIndigo }}>{established}</div>
				</div>
			</div>

			{/* Statistics */}
			<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
				<SectionTitle title="Organization Statistics" />
				<div style={{ display: "flex", flexDirection: "row", gap: "14px" }}>
					{primaryStats.map((stat) => (
						<StatCard stat={stat} />
					))}
				</div>
				<div style={{ display: "flex", flexDirection: "row", gap: "14px" }}>
					{activityStats.map((stat) => (
						<StatCard stat={stat} />
					))}
				</div>
			</div>

			{/* Top repositories */}
			<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
				<SectionTitle title="Top Repositories" icon="graph" />
				{topRepositories.length > 0 ? (
					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						{topRepositories.map((repo) => (
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									gap: "16px",
									padding: "16px 20px",
									backgroundColor: colors.white,
									border: `1px solid ${colors.lightAsh}`,
									borderRadius: "8px",
								}}
							>
								<div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: "6px" }}>
									<div style={{ fontSize: "24px", color: colors.asterViolet }}>{repo.name}</div>
									<div style={{ fontSize: "16px", lineHeight: 1.4, color: colors.forestInk }}>
										{repo.description ? truncate(repo.description, 72) : "No description provided."}
									</div>
									<div style={{ fontSize: "15px", color: colors.dustyLilac }}>{`Updated ${formatDate(repo.updated_at)}`}</div>
								</div>
								<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
									<div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
										<Octicon kind="star" size={20} />
										<div style={{ fontSize: "22px", color: colors.midnightIndigo }}>{formatNumber(repo.stargazers_count)}</div>
									</div>
									{repo.language ? (
										<div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
											<div style={{ width: "12px", height: "12px", borderRadius: "6px", backgroundColor: getLanguageColor(repo.language) }} />
											<div style={{ fontSize: "15px", color: colors.dustyLilac }}>{repo.language}</div>
										</div>
									) : null}
								</div>
							</div>
						))}
					</div>
				) : (
					<div style={{ display: "flex", fontSize: "18px", color: colors.dustyLilac }}>
						No public repositories to show.
					</div>
				)}
			</div>

			{/* Language composition */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					padding: "22px 24px",
					gap: "16px",
					backgroundColor: colors.white,
					border: `1px solid ${colors.lightAsh}`,
					borderRadius: "8px",
				}}
			>
				<div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
					<div style={{ fontSize: "28px", color: colors.midnightIndigo }}>Language Composition</div>
					<div style={{ fontSize: "14px", color: colors.dustyLilac }}>BY CODE BYTES</div>
				</div>
				{languages.length > 0 ? (
					<>
						<div style={{ display: "flex", flexDirection: "row", width: "100%", height: "20px", overflow: "hidden", borderRadius: "4px", backgroundColor: colors.mistBlue }}>
							{languages.map((language) => (
								<div style={{ display: "flex", width: `${language.percent}%`, height: "20px", backgroundColor: language.color }} />
							))}
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
							{languages.map((language) => (
								<div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px" }}>
									<div style={{ width: "14px", height: "14px", borderRadius: "3px", backgroundColor: language.color, flexShrink: 0 }} />
									<div style={{ display: "flex", flex: 1, minWidth: 0, fontSize: "19px", color: colors.forestInk }}>{language.name}</div>
									<div style={{ display: "flex", width: "76px", justifyContent: "flex-end", fontSize: "18px", color: colors.dustyLilac }}>{`${language.percent.toFixed(1)}%`}</div>
								</div>
							))}
						</div>
						<div style={{ fontSize: "14px", lineHeight: 1.4, color: colors.dustyLilac }}>
							Calculated from language bytes reported by GitHub's repository API.
						</div>
					</>
				) : (
					<div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px 0", fontSize: "18px", color: colors.dustyLilac }}>
						No language data available for public repositories.
					</div>
				)}
			</div>

			{/* Principles */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					padding: "22px 24px",
					gap: "16px",
					backgroundColor: colors.mistBlue,
					border: `1px solid ${colors.lightAsh}`,
					borderRadius: "8px",
				}}
			>
				<div style={{ fontSize: "28px", color: colors.midnightIndigo }}>Aster451 Principles</div>
				{[
					{ title: "Readable", text: "Careful typography and clear hierarchy." },
					{ title: "Accessible", text: "Thoughtful contrast and approachable interfaces." },
					{ title: "Expressive", text: "A restrained palette with room for character." },
				].map((item, index) => (
					<div style={{ display: "flex", flexDirection: "row", gap: "14px", alignItems: "flex-start" }}>
						<div style={{ display: "flex", width: "36px", height: "36px", justifyContent: "center", alignItems: "center", borderRadius: "18px", backgroundColor: colors.white, color: colors.asterViolet, fontSize: "16px", flexShrink: 0 }}>{`0${index + 1}`}</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
							<div style={{ fontSize: "21px", color: colors.midnightIndigo }}>{item.title}</div>
							<div style={{ fontSize: "17px", lineHeight: 1.45, color: colors.forestInk }}>{item.text}</div>
						</div>
					</div>
				))}
				<div style={{ display: "flex", flexDirection: "column", paddingTop: "14px", borderTop: `1px solid ${colors.lightAsh}`, gap: "4px" }}>
					<div style={{ fontSize: "14px", color: colors.dustyLilac }}>OPEN SOURCE</div>
					<div style={{ fontSize: "18px", color: colors.midnightIndigo }}>Explore projects, report issues, contribute.</div>
				</div>
			</div>

			{/* Footer */}
			<div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "14px", borderTop: `1px solid ${colors.lightAsh}`, fontSize: "14px", color: colors.dustyLilac }}>
				<div>ASTER451 TEMPLATE · ORGANIZATION OVERVIEW</div>
				<div>{`Accessible by design. · ${formatNumber(languageTotal)} language bytes`}</div>
				<div>{`Generated at ${formatDateTime(generatedAt)}`}</div>
				<div>Generated with vercel/satori (github.com/vercel/satori)</div>
			</div>
		</div>,
		{
			// Height is omitted on purpose: satori sizes the image to its content.
			width: 800,
			fonts: [
				{
					name: "Zen Old Mincho",
					data: font,
					weight: 400,
					style: "normal",
				},
			],
		},
	);

	const outputDirectory = path.resolve("dist");
	const outputPath = path.join(outputDirectory, "overview.svg");
	await mkdir(outputDirectory, { recursive: true });
	await writeFile(outputPath, svg, "utf8");
	console.log(`Generated: ${outputPath}`);
}

main().catch((error: unknown) => {
	console.error("Failed to generate organization profile:");
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});