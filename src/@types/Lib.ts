export type GithubReleaseAsset = {
  id: number,
  name: string,
  size: number,
  content_type: string,
  browser_download_url: string
}

export type GithubRelease = {
  id: number,
  tag_name: string,
  name: string,
  draft: boolean,
  prerelease: boolean,
  published_at: string,
  assets: GithubReleaseAsset[]
}
