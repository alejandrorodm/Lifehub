export interface GithubActivity {
  repo: string;
  repoUrl: string;
  lastCommitAt: string | null;
  lastCommitMessage: string | null;
  lastCommitAuthor: string | null;
  /** Aproximado: un único `since` + `per_page=100`, tope de 100 commits contados. */
  commitsLast30Days: number;
}

export interface GithubActivityResult {
  configured: boolean;
  linked: boolean;
  activity: GithubActivity | null;
  error: string | null;
}

export interface GithubStatusDto {
  /** El servidor tiene la OAuth App de GitHub configurada. */
  configured: boolean;
  /** Este perfil ha conectado su cuenta de GitHub. */
  connected: boolean;
  login: string | null;
}
