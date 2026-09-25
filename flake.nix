{
  description = "stellar-toml-lint - Offline SEP-1 linter for stellar.toml";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      buildFor = system:
        let
          pkgs = import nixpkgs { inherit system; config.allowUnfree = true; };
          npmPackage = pkgs.buildNpmPackage {
            pname = "stellar-toml-lint";
            version = "0.1.0";
            src = self;
            doCheck = false;
            installFlags = [ "--ignore-scripts" ];
            npmDepsHash = "sha256-W00RXqfBukJRZO4hph8dLn1IaDOQKP3iNWmNcQOuhc4=";
            nativeBuildInputs = with pkgs; [
              nodejs_22
              python3
              pkg-config
              libtool
              automake
              autoconf
              gnumake
              gcc
              ccache
            ];
            postInstall = ''
              mkdir -p $out/bin
              cat > $out/bin/stellar-toml-lint <<'EOF'
#!/usr/bin/env sh
exec node $out/lib/node_modules/stellar-toml-lint/dist/cli.js "$@"
EOF
              chmod +x $out/bin/stellar-toml-lint
            '';
          };
        in {
          packages.default = npmPackage;
          apps.default = { type = "app"; program = "${npmPackage}/bin/stellar-toml-lint"; };
          devShells.default = pkgs.mkShell {
            buildInputs = with pkgs; [ nodejs_22 npm git ];
            shellHook = ''
              export PATH="${npmPackage}/bin:$PATH"
              echo "stellar-toml-lint development environment ready"
              echo "Run 'stellar-toml-lint --help' to get started"
            '';
          };
          legacyPackages.stellar-toml-lint = npmPackage;
        };
      darwinBuildFor = system:
        let
          pkgs = import nixpkgs { inherit system; config.allowUnfree = true; };
          npmPackage = pkgs.buildNpmPackage {
            pname = "stellar-toml-lint";
            version = "0.1.0";
            src = self;
            doCheck = false;
            installFlags = [ "--ignore-scripts" ];
            npmDepsHash = "sha256-W00RXqfBukJRZO4hph8dLn1IaDOQKP3iNWmNcQOuhc4=";
            nativeBuildInputs = with pkgs; [
              nodejs_22
              python3
              pkg-config
              libtool
              automake
              autoconf
              gnumake
              gcc
              ccache
            ];
            postInstall = ''
              mkdir -p $out/bin
              cat > $out/bin/stellar-toml-lint <<'EOF'
#!/usr/bin/env sh
exec node $out/lib/node_modules/stellar-toml-lint/dist/cli.js "$@"
EOF
              chmod +x $out/bin/stellar-toml-lint
            '';
          };
        in {
          packages.default = npmPackage;
          apps.default = { type = "app"; program = "${npmPackage}/bin/stellar-toml-lint"; };
          devShells.default = pkgs.mkShell {
            buildInputs = with pkgs; [ nodejs_22 npm git ];
            shellHook = ''
              export PATH="${npmPackage}/bin:$PATH"
              echo "stellar-toml-lint development environment ready"
              echo "Run 'stellar-toml-lint --help' to get started"
            '';
          };
          legacyPackages.stellar-toml-lint = npmPackage;
        };
    in
      flake-utils.lib.genAttrs systems buildFor
      // flake-utils.lib.genAttrs [ "x86_64-darwin" ] (system:
        let pkgs = import nixpkgs { inherit system; config.allowUnfree = true; };
        in {
          packages.default = pkgs.buildNpmPackage {
            pname = "stellar-toml-lint";
            version = "0.1.0";
            src = self;
            doCheck = false;
            installFlags = [ "--ignore-scripts" ];
            npmDepsHash = "sha256-W00RXqfBukJRZO4hph8dLn1IaDOQKP3iNWmNcQOuhc4=";
            nativeBuildInputs = with pkgs; [
              nodejs_22
              python3
              pkg-config
              libtool
              automake
              autoconf
              gnumake
              gcc
              ccache
            ];
            postInstall = ''
              mkdir -p $out/bin
              cat > $out/bin/stellar-toml-lint <<'EOF'
#!/usr/bin/env sh
exec node $out/lib/node_modules/stellar-toml-lint/dist/cli.js "$@"
EOF
              chmod +x $out/bin/stellar-toml-lint
            '';
          };
          apps.default = { type = "app"; program = "${pkgs.buildNpmPackage.pname}/bin/stellar-toml-lint"; };
          devShells.default = pkgs.mkShell {
            buildInputs = with pkgs; [ nodejs_22 npm git ];
            shellHook = ''
              export PATH="${pkgs.buildNpmPackage.pname}/bin:$PATH"
              echo "stellar-toml-lint development environment ready"
              echo "Run 'stellar-toml-lint --help' to get started"
            '';
          };
        }
      );
}