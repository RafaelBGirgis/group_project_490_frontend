"""
pages/landing_page.py — Page Object for the Landing page.

Encapsulates selectors and actions for the landing page homepage.
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage


class LandingPage(BasePage):
    URL = "/"

    # --- Navigation ---
    LOGO_LINK = (By.XPATH, "//a[contains(@href, '/')]//img[@alt='']")
    LOGIN_LINK = (By.XPATH, "//a[contains(@href, '/login') and contains(text(), 'Log in')]")
    GET_STARTED_NAV = (By.XPATH, "//a[contains(@href, '/signup') and contains(text(), 'Get started')]")
    
    # --- Hero CTA Buttons ---
    START_FREE_BUTTON = (By.XPATH, "//a[contains(@href, '/signup') and contains(., 'Start for free')]")
    HAVE_ACCOUNT_BUTTON = (By.XPATH, "//a[contains(@href, '/login') and contains(text(), 'I have an account')]")

    # --- Feature Pills ---
    CLIENT_TOOLS_PILL = (By.XPATH, "//span[contains(text(), 'Client tools')]")
    COACH_TOOLS_PILL = (By.XPATH, "//span[contains(text(), 'Coach tools')]")
    SHARED_PILL = (By.XPATH, "//div[contains(., 'Shared')]")

    # --- Feature Cards (bento grid) ---
    BUILD_WORKOUTS_CARD = (By.XPATH, "//h3[contains(text(), 'Build your workouts')]")
    ASSIGN_PROGRAMS_CARD = (By.XPATH, "//h3[contains(text(), 'Assign programs')]")
    TRACK_EVERYTHING_CARD = (By.XPATH, "//h3[contains(text(), 'Track everything')]")
    MANAGE_ROSTER_CARD = (By.XPATH, "//h3[contains(text(), 'Manage your roster')]")
    REAL_TIME_MESSAGING_CARD = (By.XPATH, "//h3[contains(text(), 'Real-time messaging')]")
    GROWTH_ANALYTICS_CARD = (By.XPATH, "//h3[contains(text(), 'Growth analytics')]")
    LOG_MEALS_CARD = (By.XPATH, "//h3[contains(text(), 'Log meals')]")
    FIND_PERFECT_MATCH_CARD = (By.XPATH, "//h3[contains(text(), 'Find your perfect match')]")

    # --- Stats Section ---
    STATS_SECTION = (By.XPATH, "//p[contains(text(), 'Preset workouts')]/..")
    ACTIVE_USERS_STAT = (By.XPATH, "//p[contains(text(), 'Active users')]")
    VERIFIED_COACHES_STAT = (By.XPATH, "//p[contains(text(), 'Verified coaches')]")
    SATISFACTION_STAT = (By.XPATH, "//p[contains(text(), 'Satisfaction')]")

    # --- Final CTA Section ---
    READY_HEADING = (By.XPATH, "//span[contains(text(), 'Ready to go')]")
    JOIN_CLIENT_BUTTON = (By.XPATH, "//a[contains(@href, '/signup?role=client') and contains(text(), 'Join as Client')]")
    BECOME_COACH_BUTTON = (By.XPATH, "//a[contains(@href, '/signup?role=coach') and contains(text(), 'Become a Coach')]")
    FINAL_LOGIN_LINK = (By.XPATH, "//a[contains(@href, '/login') and contains(text(), 'Log in')]")

    # --- Actions ---

    def open(self):
        """Navigate to landing page."""
        super().open(self.URL)

    def click_get_started(self):
        """Click the 'Get started' button in navigation."""
        self.click(self.GET_STARTED_NAV)

    def click_login(self):
        """Click the 'Log in' link in navigation."""
        self.click(self.LOGIN_LINK)

    def click_start_free(self):
        """Click the 'Start for free' CTA button."""
        self.click(self.START_FREE_BUTTON)

    def click_have_account(self):
        """Click the 'I have an account' button."""
        self.click(self.HAVE_ACCOUNT_BUTTON)

    def click_join_as_client(self):
        """Click the 'Join as Client' button at bottom."""
        self.click(self.JOIN_CLIENT_BUTTON)

    def click_become_coach(self):
        """Click the 'Become a Coach' button at bottom."""
        self.click(self.BECOME_COACH_BUTTON)

    def scroll_to_stats(self):
        """Scroll to the stats section to trigger reveal."""
        stats_el = self.find(self.STATS_SECTION, timeout=5)
        self.driver.execute_script("arguments[0].scrollIntoView(true);", stats_el)

    def scroll_to_final_cta(self):
        """Scroll to the final CTA section."""
        cta_el = self.find(self.READY_HEADING, timeout=5)
        self.driver.execute_script("arguments[0].scrollIntoView(true);", cta_el)

    # --- Assertions helpers ---

    def feature_card_visible(self, locator: tuple) -> bool:
        """Check if a feature card is visible."""
        return self.is_visible(locator, timeout=3)

    def stats_section_visible(self) -> bool:
        """Check if stats section is visible."""
        return self.is_visible(self.STATS_SECTION, timeout=5)

    def ready_heading_visible(self) -> bool:
        """Check if final CTA heading is visible."""
        return self.is_visible(self.READY_HEADING, timeout=5)

    def all_feature_cards_visible(self) -> bool:
        """Check if all main feature cards are present."""
        cards = [
            self.feature_card_visible(self.BUILD_WORKOUTS_CARD),
            self.feature_card_visible(self.ASSIGN_PROGRAMS_CARD),
            self.feature_card_visible(self.TRACK_EVERYTHING_CARD),
            self.feature_card_visible(self.MANAGE_ROSTER_CARD),
            self.feature_card_visible(self.REAL_TIME_MESSAGING_CARD),
            self.feature_card_visible(self.GROWTH_ANALYTICS_CARD),
            self.feature_card_visible(self.LOG_MEALS_CARD),
            self.feature_card_visible(self.FIND_PERFECT_MATCH_CARD),
        ]
        return all(cards)
