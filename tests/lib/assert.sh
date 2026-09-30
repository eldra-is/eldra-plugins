# Minimal assertions for shell tests. Source it, call the asserts, end with `finish`.
failures=0

pass() { printf 'ok   %s\n' "$1"; }
fail() { printf 'FAIL %s\n     %s\n' "$1" "$2"; failures=$((failures + 1)); }

assert_eq() { # assert_eq NAME EXPECTED ACTUAL
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "expected [$2], got [$3]"; fi
}

assert_status() { # assert_status NAME EXPECTED_STATUS ACTUAL_STATUS
  assert_eq "$1 (exit status)" "$2" "$3"
}

assert_contains() { # assert_contains NAME NEEDLE HAYSTACK
  case "$3" in *"$2"*) pass "$1" ;; *) fail "$1" "[$2] not found in [$3]" ;; esac
}

assert_file_contains() { # assert_file_contains NAME FILE FIXED_LINE_OR_TEXT
  if [ -f "$2" ] && grep -qF -- "$3" "$2"; then pass "$1"; else fail "$1" "[$3] not in $2"; fi
}

assert_file_lacks() { # assert_file_lacks NAME FILE TEXT
  if [ -f "$2" ] && ! grep -qF -- "$3" "$2"; then pass "$1"; else fail "$1" "[$3] unexpectedly in $2 (or file missing)"; fi
}

finish() {
  if [ "$failures" -gt 0 ]; then printf '%s failure(s)\n' "$failures"; exit 1; fi
  printf 'all passed\n'
}
