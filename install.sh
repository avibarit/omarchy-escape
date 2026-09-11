#!/usr/bin/env bash
# Install Omarchy Escape as a native desktop app.
#
# One-click (public GitHub repo):
#   curl -fsSL https://raw.githubusercontent.com/avibarit/omarchy-escape/main/install.sh | bash
#
# From a local clone:
#   ./install.sh
set -euo pipefail

REPO_URL="${OMARCHY_ESCAPE_REPO:-https://github.com/avibarit/omarchy-escape.git}"
BRANCH="${OMARCHY_ESCAPE_BRANCH:-main}"
INSTALL_DIR="${OMARCHY_ESCAPE_HOME:-${HOME}/.local/share/omarchy-escape}"

running_from_checkout() {
  local src="${BASH_SOURCE[0]:-}"
  [[ -n "$src" && "$src" != "bash" && "$src" != "-" && -f "$src" ]] || return 1
  local root
  root="$(cd "$(dirname "$src")" && pwd)"
  [[ -x "$root/omarchy-escape" && -f "$root/hypr/omarchy-escape.lua" ]]
}

bootstrap_from_github() {
  if ! command -v git >/dev/null 2>&1; then
    echo "omarchy-escape: git is required to install from GitHub." >&2
    exit 1
  fi
  mkdir -p "$(dirname "$INSTALL_DIR")"
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    echo "Updating Omarchy Escape in ${INSTALL_DIR}"
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
  else
    echo "Cloning Omarchy Escape → ${INSTALL_DIR}"
    rm -rf "$INSTALL_DIR"
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi
  exec env OMARCHY_ESCAPE_BOOTSTRAPPED=1 bash "$INSTALL_DIR/install.sh"
}

if ! running_from_checkout; then
  if [[ "${OMARCHY_ESCAPE_BOOTSTRAPPED:-}" == 1 ]]; then
    echo "omarchy-escape: clone at ${INSTALL_DIR} is missing the native host." >&2
    echo "Push omarchy-escape, hypr/, icons/, and install.sh to GitHub, then rerun." >&2
    exit 1
  fi
  bootstrap_from_github
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${HOME}/.local/bin"
APP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/scalable/apps"
HYPR_DIR="${HOME}/.config/hypr"
HYPRLAND="${HYPR_DIR}/hyprland.lua"

if ! python3 -c "import gi; gi.require_version('Gtk', '3.0'); gi.require_version('WebKit2', '4.1')" >/dev/null 2>&1; then
  echo "omarchy-escape: need Python GTK3 + WebKitGTK 4.1 (python-gobject, gtk3, webkit2gtk-4.1)." >&2
  exit 1
fi

mkdir -p "$BIN_DIR" "$APP_DIR" "$ICON_DIR" "$HYPR_DIR"

chmod +x "${ROOT}/omarchy-escape" "${ROOT}/install.sh"
ln -sfn "${ROOT}/omarchy-escape" "${BIN_DIR}/omarchy-escape"
ln -sfn "${ROOT}/hypr/omarchy-escape.lua" "${HYPR_DIR}/omarchy-escape.lua"
ln -sfn "${ROOT}/icons/omarchy-escape.svg" "${ICON_DIR}/omarchy-escape.svg"

cat > "${APP_DIR}/omarchy-escape.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Omarchy Escape
GenericName=Hyprland survival trainer
Comment=Learn Omarchy tiling shortcuts inside a dwindle session
Exec=${ROOT}/omarchy-escape
Icon=omarchy-escape
Terminal=false
Categories=Game;Education;
StartupNotify=true
StartupWMClass=org.omarchy.escape
Keywords=hyprland;omarchy;tiling;shortcuts;
EOF

if [[ -f "$HYPRLAND" ]] && ! grep -q 'hypr.omarchy-escape' "$HYPRLAND"; then
  cp "$HYPRLAND" "${HYPRLAND}.bak.$(date +%s)"
  printf '\n-- Omarchy Escape trainer (Super passthrough while focused).\nrequire("hypr.omarchy-escape")\n' >> "$HYPRLAND"
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APP_DIR" >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f "${HOME}/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

if command -v hyprctl >/dev/null 2>&1; then
  hyprctl reload >/dev/null
  errors="$(hyprctl configerrors 2>/dev/null || true)"
  if [[ -n "${errors}" && "${errors}" != "no errors" && "${errors}" != *"no errors"* ]]; then
    echo "hyprctl configerrors:"
    echo "$errors"
  fi
fi

echo "Installed Omarchy Escape."
echo "  launch: omarchy-escape"
echo "  menu:   search “Omarchy Escape”"
echo "  Unlock Super (or Super+Escape), then Super+W closes the window."
if [[ ":${PATH}:" != *":${BIN_DIR}:"* ]]; then
  echo "  note:   add ${BIN_DIR} to PATH if the command is not found"
fi
