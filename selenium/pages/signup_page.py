"""
pages/signup_page.py — Page Object for the Signup page.

Encapsulates selectors and actions for user registration.
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage


class SignupPage(BasePage):
    URL = "/signup"

    # --- Navigation ---
    LOGO = (By.XPATH, "//img[@alt='Till Failure']")
    LOGIN_LINK = (By.XPATH, "//a[contains(@href, '/login') and contains(text(), 'Sign in')]")

    # --- Info Panel (left side, hidden on mobile) ---
    INFO_PANEL_HEADING = (By.XPATH, "//h1[contains(text(), 'Create your')]")

    # --- Form Elements ---
    FORM_HEADING = (By.XPATH, "//h2[contains(text(), 'Create your')]")
    FORM_SUBHEADING = (By.XPATH, "//p[contains(text(), 'Start your fitness journey')]")

    # Google OAuth
    GOOGLE_BUTTON = (By.XPATH, "//button[contains(., 'Continue with Google')]")

    # Form fields
    NAME_INPUT = (By.XPATH, "//input[@name='name']")
    EMAIL_INPUT = (By.XPATH, "//input[@name='email']")
    AGE_INPUT = (By.XPATH, "//input[@name='age']")
    GENDER_SELECT = (By.XPATH, "//select[@name='gender']")
    PASSWORD_INPUT = (By.XPATH, "//input[@name='password']")
    CONFIRM_PASSWORD_INPUT = (By.XPATH, "//input[@name='confirmPassword']")
    PFP_URL_INPUT = (By.XPATH, "//input[@name='pfpUrl']")
    BIO_INPUT = (By.XPATH, "//textarea[@name='bio']")

    # Submit button
    CREATE_ACCOUNT_BUTTON = (By.XPATH, "//button[contains(text(), 'Create account')]")

    # Error message
    ERROR_MESSAGE = (By.XPATH, "//p[contains(@class, 'text-red')]")

    # --- Actions ---

    def open(self):
        """Navigate to signup page."""
        super().open(self.URL)

    def enter_name(self, name: str):
        """Enter name in the name field."""
        self.type(self.NAME_INPUT, name)

    def enter_email(self, email: str):
        """Enter email in the email field."""
        self.type(self.EMAIL_INPUT, email)

    def enter_age(self, age: str):
        """Enter age in the age field."""
        self.type(self.AGE_INPUT, age)

    def select_gender(self, gender: str):
        """Select gender from dropdown."""
        self.find_visible(self.GENDER_SELECT).send_keys(gender)

    def enter_password(self, password: str):
        """Enter password in the password field."""
        self.type(self.PASSWORD_INPUT, password)

    def enter_confirm_password(self, password: str):
        """Enter confirm password."""
        self.type(self.CONFIRM_PASSWORD_INPUT, password)

    def enter_pfp_url(self, url: str):
        """Enter profile picture URL (optional)."""
        self.type(self.PFP_URL_INPUT, url)

    def enter_bio(self, bio: str):
        """Enter bio (optional)."""
        self.type(self.BIO_INPUT, bio)

    def submit_form(self):
        """Click the 'Create account' button."""
        self.click(self.CREATE_ACCOUNT_BUTTON)

    def signup(self, name: str, email: str, age: str, gender: str, password: str, pfp_url: str = "", bio: str = ""):
        """
        Convenience method to fill and submit signup form.
        
        Args:
            name: User's name
            email: User's email
            age: User's age
            gender: User's gender (e.g., "Male", "Female", "Non-Binary", "Prefer not to say")
            password: User's password
            pfp_url: Profile picture URL (optional)
            bio: Bio (optional)
        """
        self.enter_name(name)
        self.enter_email(email)
        self.enter_age(age)
        self.select_gender(gender)
        self.enter_password(password)
        self.enter_confirm_password(password)
        if pfp_url:
            self.enter_pfp_url(pfp_url)
        if bio:
            self.enter_bio(bio)
        self.submit_form()

    # --- Assertions helpers ---

    def form_heading_visible(self) -> bool:
        """Check if form heading is visible."""
        return self.is_visible(self.FORM_HEADING)

    def google_button_visible(self) -> bool:
        """Check if Google OAuth button is visible."""
        return self.is_visible(self.GOOGLE_BUTTON)

    def all_form_fields_visible(self) -> bool:
        """Check if all required form fields are visible."""
        fields = [
            self.is_visible(self.NAME_INPUT, timeout=2),
            self.is_visible(self.EMAIL_INPUT, timeout=2),
            self.is_visible(self.AGE_INPUT, timeout=2),
            self.is_visible(self.GENDER_SELECT, timeout=2),
            self.is_visible(self.PASSWORD_INPUT, timeout=2),
            self.is_visible(self.CONFIRM_PASSWORD_INPUT, timeout=2),
        ]
        return all(fields)

    def error_message_visible(self) -> bool:
        """Check if error message is visible."""
        return self.is_visible(self.ERROR_MESSAGE, timeout=3)

    def get_error_message(self) -> str:
        """Get the error message text."""
        return self.get_text(self.ERROR_MESSAGE)

    def login_link_visible(self) -> bool:
        """Check if 'Sign in' link is visible."""
        return self.is_visible(self.LOGIN_LINK)
