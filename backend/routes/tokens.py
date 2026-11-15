"""Token routes – registers the router defined in `controllers/token_controller`.

The router is imported here so that `api_router.include_router` in
`routes/__init__.py` picks it up.
"""

from controllers.token_controller import router as tokens_router  # noqa: F401

# Export the router under the expected name for inclusion
router = tokens_router
