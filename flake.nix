{
  description = "stellar-toml-lint - Offline SEP-1 linter for stellar.toml";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    nixpkgs-darwin.url = "github:NixOS/nixpkgs/nixpkgs-26.05-darwin";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, nixpkgs-darwin, flake-utils }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" ] (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        npmPackage = pkgs.buildNpmPackage {
          pname = "stellar-toml-lint";
          version = "0.1.0";
          src = self;
          doCheck = false;
          installFlags = [ "--ignore-scripts" ];
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
      }
    )
    // flake-utils.lib.eachSystem [ "x86_64-darwin" ] (system:
      let
        pkgs = import nixpkgs-darwin {
          inherit system;
          config.allowUnfree = true;
        };

        npmPackage = pkgs.buildNpmPackage {
          pname = "stellar-toml-lint";
          version = "0.1.0";
          src = self;
          doCheck = false;
          installFlags = [ "--ignore-scripts" ];
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
      }
    );
}