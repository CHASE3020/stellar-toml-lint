{
  description = "stellar-toml-lint - Offline SEP-1 linter for stellar.toml";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # Build the npm package
        npmPackage = pkgs.buildNpmPackage {
          pname = "stellar-toml-lint";
          version = "0.1.0";
          src = self;
          # Don't run tests during build to avoid network calls
          doCheck = false;
          # Install the binary globally
          installFlags = [ "--ignore-scripts" ];
          # Native build dependencies for vscode-oniguruma WASM
          nativeBuildInputs = with pkgs; [
            nodejs_22
            python3
            pkg-config
            libtool
            automake
            autoconf
            make
            gcc
          ];
          # Ensure the binary is linked
          postInstall = ''
            # The binary is already in dist/cli.js from the build
            # Create a wrapper script
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

        apps.default = {
          type = "app";
          program = "${npmPackage}/bin/stellar-toml-lint";
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            npm
            git
          ];
          shellHook = ''
            export PATH="${npmPackage}/bin:$PATH"
            echo "stellar-toml-lint development environment ready"
            echo "Run 'stellar-toml-lint --help' to get started"
          '';
        };

        # Provide the binary for direct nix run
        legacyPackages = {
          stellar-toml-lint = npmPackage;
        };
      }
    );
}