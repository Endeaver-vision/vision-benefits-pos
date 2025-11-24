PY ?= python3
REQUEST ?= samples/request_vsp.json

.PHONY: quote serve test

quote:
	$(PY) -m pricing_engine.cli --request-file $(REQUEST) --pretty

serve:
	$(PY) -m pricing_engine.server

test:
	$(PY) -m unittest discover -s tests -p "test_*.py"
