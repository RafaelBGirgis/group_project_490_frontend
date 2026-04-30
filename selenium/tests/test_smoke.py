"""
tests/test_smoke.py — Basic connectivity and routing smoke tests.

These run first and fast. If these fail, everything else will too.
"""

import os
import pytest

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")


class TestSmoke:

    def test_frontend_is_reachable(self, driver):
        """Frontend dev server responds at BASE_URL."""
        driver.get(BASE_URL)
        assert driver.title is not None, "Page loaded but title is None"

    def test_login_route_exists(self, driver):
        """Navigating to /login does not 404."""
        driver.get(f"{BASE_URL}/login")
        # A React SPA with react-router will always return 200 from Vite —
        # so we check that the page body is non-empty instead.
        body_text = driver.find_element("tag name", "body").text
        assert body_text.strip(), "/login rendered an empty page"

    def test_protected_route_redirects_to_login(self, driver):
        """Visiting a protected route while unauthenticated redirects to /login."""
        driver.get(f"{BASE_URL}/dashboard")
        # Allow a moment for react-router to redirect
        import time; time.sleep(1)
        assert "/login" in driver.current_url(), (
            f"Expected redirect to /login from protected route, got: {driver.current_url()}"
        )
