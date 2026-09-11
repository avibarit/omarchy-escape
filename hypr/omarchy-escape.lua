-- Omarchy Escape: while the trainer is focused, Super belongs to the game.
-- Unlock Super from the app (or Super+Escape) so Super+W can close the window.

local TRAINER_CLASS = "^org\\.omarchy\\.escape$"
local STATE_DIR = (os.getenv("HOME") or "") .. "/.local/state/omarchy-escape"
local UNLOCK_FLAG = STATE_DIR .. "/super-unlocked"

o.window(TRAINER_CLASS, {
  tag = "-default-opacity",
  opacity = "1 1",
  idle_inhibit = "focus",
})

local function is_trainer(window)
  if not window then
    return false
  end
  local class = window.class or ""
  local initial = window.initial_class or ""
  return class == "org.omarchy.escape" or initial == "org.omarchy.escape"
end

local function super_unlocked()
  local f = io.open(UNLOCK_FLAG, "r")
  if not f then
    return false
  end
  f:close()
  return true
end

local function set_unlocked(on)
  if on then
    local f = io.open(UNLOCK_FLAG, "w")
    if not f then
      os.execute("mkdir -p '" .. STATE_DIR:gsub("'", "'\\''") .. "'")
      f = io.open(UNLOCK_FLAG, "w")
    end
    if f then
      f:write("1\n")
      f:close()
    end
  else
    os.remove(UNLOCK_FLAG)
  end
end

local function reset_submap()
  if hl.get_current_submap() == "omarchy-escape" then
    hl.dispatch(hl.dsp.submap(""))
  end
end

local function grab_super_if_needed(window)
  if not is_trainer(window) then
    reset_submap()
    return
  end
  if super_unlocked() then
    reset_submap()
    return
  end
  hl.dispatch(hl.dsp.submap("omarchy-escape"))
end

hl.define_submap("omarchy-escape", function()
  -- Empty on purpose: Omarchy Super binds are replaced, so the real Super
  -- chord reaches the focused trainer window. Super+Escape releases Super
  -- back to the desktop; Super+W then closes this window.
  hl.bind("SUPER + ESCAPE", function()
    set_unlocked(true)
    hl.dispatch(hl.dsp.submap(""))
  end, { description = "Release Super so Super+W closes Omarchy Escape" })
end)

hl.on("window.active", function(window)
  grab_super_if_needed(window)
end)

hl.on("window.close", function(window)
  if is_trainer(window) then
    set_unlocked(false)
    reset_submap()
  end
end)
