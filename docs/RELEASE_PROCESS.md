# Release Process

This project distributes release builds as VSIX assets attached to GitHub Releases. The workflow uses the official `@vscode/vsce` CLI and runs automatically when a matching version tag is pushed.

## Prerequisites

- Write access to `fean-developer/vscode-act-runner-local`.
- Node.js 20 or newer.
- A clean working tree.
- The release version in `package.json` and `package-lock.json` must match the tag.

## Prepare a release

1. Update the version in `package.json` and `package-lock.json` to the next semantic version, for example `2.11.0`.
2. Run the local checks:

   ```sh
   npm install
   npm run typecheck
   npm test -- --runInBand
   npm run build
   npm run package
   ```

3. Inspect the generated `act-visual-runner-<version>.vsix` if needed.
4. Commit the release change:

   ```sh
   git add package.json package-lock.json
   git commit -m "Release v<version>"
   ```

5. Create and push the matching tag:

   ```sh
   git tag v<version>
   git push origin HEAD
   git push origin v<version>
   ```

Replace `<version>` with the exact value from `package.json`, such as `2.11.0`.

## GitHub Actions release

The `Release VSIX` workflow runs for tags matching `v*`. It checks out the tagged commit, installs dependencies with `npm install`, runs typecheck and tests, verifies that the tag equals `v` plus the package version, builds and packages the VSIX, and creates a GitHub Release with generated notes. The VSIX is uploaded as a release asset.

A manual workflow dispatch is also available, but the tag/version check means it should be used only when the selected ref is the intended release tag.

## Download and install

1. Open the repository's **Releases** page on GitHub.
2. Download the `.vsix` asset for the desired version.
3. In VS Code, open **Extensions**.
4. Open the `...` menu and choose **Install from VSIX...**.
5. Select the downloaded file and reload VS Code if prompted.

The command-line equivalent is:

```sh
code --install-extension act-visual-runner-<version>.vsix
```

## Failed or repeated releases

If validation fails, fix the branch and create a new version tag. A tag cannot be reused safely for a changed commit. For a failed release creation after the VSIX was built, rerun the workflow for the same tag only if the tag still points to the correct immutable commit and the GitHub Release does not already exist.

If a release already exists and the asset needs to be replaced, delete the incorrect release asset through GitHub and rerun the workflow, or upload the corrected VSIX to that release manually after verifying its version.

## Marketplace publishing

GitHub Releases and the VSIX asset are the project's release mechanism. Publishing to the Visual Studio Marketplace is separate and is not performed by this workflow. If Marketplace publishing is enabled later, use a protected `VSCE_PAT` repository secret and a separate, reviewed workflow step using `vsce publish`.
