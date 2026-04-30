"""
pages/login_page.py — Page Object for the Login screen.

Selectors here are reasonable defaults for a standard React/Tailwind login form.
Update them if your actual DOM differs.
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage


class LoginPage(BasePage):
    URL = "/login"

    # --- Locators ---
    EMAIL_INPUT    = (By.CSS_SELECTOR, "input[type='email'], input[name='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'], input[name='password']")
    SUBMIT_BUTTON  = (By.CSS_SELECTOR, "button[type='submit']")
    ERROR_MESSAGE  = (By.CSS_SELECTOR, "[role='alert'], .error, [class*='error'], [class*='alert']")

    # --- Actions ---

    def open(self):
        super().open(self.URL)

    def enter_email(self, email: str):
        self.type(self.EMAIL_INPUT, email)

    def enter_password(self, password: str):
        self.type(self.PASSWORD_INPUT, password)

    def submit(self):
        self.click(self.SUBMIT_BUTTON)

    def login(self, email: str, password: str):
        """Convenience: fill and submit in one call."""
        self.enter_email(email)
        self.enter_password(password)
        self.submit()

    # --- Assertions helpers ---

    def error_message_text(self) -> str:
        return self.get_text(self.ERROR_MESSAGE)

    def is_error_visible(self) -> bool:
        return self.is_visible(self.ERROR_MESSAGE)
