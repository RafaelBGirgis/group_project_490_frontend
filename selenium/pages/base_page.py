"""
pages/base_page.py — Base class for all Page Objects.

Every page in the `pages/` folder should extend BasePage.
It wraps common Selenium actions so test code stays clean and DRY.
"""

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement


class BasePage:
    """
    Shared helpers used by every page object.

    Usage:
        class LoginPage(BasePage):
            URL = "/login"
            EMAIL_INPUT = (By.CSS_SELECTOR, "input[name='email']")

            def enter_email(self, email):
                self.type(self.EMAIL_INPUT, email)
    """

    DEFAULT_TIMEOUT = 5  # seconds

    def __init__(self, driver: WebDriver, base_url: str):
        self.driver = driver
        self.base_url = base_url.rstrip("/")
        self.wait = WebDriverWait(driver, self.DEFAULT_TIMEOUT)

    # ------------------------------------------------------------------
    # Navigation
    # ------------------------------------------------------------------

    def open(self, path: str = "") -> None:
        """Navigate to base_url + path."""
        self.driver.get(f"{self.base_url}{path}")

    def current_url(self) -> str:
        return self.driver.current_url

    def current_path(self) -> str:
        """Return just the path portion of the current URL."""
        url = self.driver.current_url
        from urllib.parse import urlparse
        return urlparse(url).path

    # ------------------------------------------------------------------
    # Element finders (with explicit waits)
    # ------------------------------------------------------------------

    def find(self, locator: tuple, timeout: int | None = None) -> WebElement:
        """Wait for element to be present and return it."""
        t = timeout or self.DEFAULT_TIMEOUT
        return WebDriverWait(self.driver, t).until(
            EC.presence_of_element_located(locator)
        )

    def find_visible(self, locator: tuple, timeout: int | None = None) -> WebElement:
        """Wait for element to be visible and return it."""
        t = timeout or self.DEFAULT_TIMEOUT
        return WebDriverWait(self.driver, t).until(
            EC.visibility_of_element_located(locator)
        )

    def find_clickable(self, locator: tuple, timeout: int | None = None) -> WebElement:
        """Wait for element to be clickable and return it."""
        t = timeout or self.DEFAULT_TIMEOUT
        return WebDriverWait(self.driver, t).until(
            EC.element_to_be_clickable(locator)
        )

    def find_all(self, locator: tuple) -> list[WebElement]:
        """Return all matching elements (no wait)."""
        return self.driver.find_elements(*locator)

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    def click(self, locator: tuple) -> None:
        self.find_clickable(locator).click()

    def type(self, locator: tuple, text: str, clear: bool = True) -> None:
        el = self.find_visible(locator)
        if clear:
            el.clear()
        el.send_keys(text)

    def get_text(self, locator: tuple) -> str:
        return self.find_visible(locator).text.strip()

    def is_visible(self, locator: tuple, timeout: int = 3) -> bool:
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(locator)
            )
            return True
        except Exception:
            return False

    def is_present(self, locator: tuple, timeout: int = 3) -> bool:
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located(locator)
            )
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Wait helpers
    # ------------------------------------------------------------------

    def wait_for_url_to_contain(self, fragment: str, timeout: int | None = None) -> None:
        t = timeout or self.DEFAULT_TIMEOUT
        WebDriverWait(self.driver, t).until(EC.url_contains(fragment))

    def wait_for_url_to_change(self, old_url: str, timeout: int | None = None) -> None:
        t = timeout or self.DEFAULT_TIMEOUT
        WebDriverWait(self.driver, t).until(EC.url_changes(old_url))

    def wait_for_text_in_element(self, locator: tuple, text: str, timeout: int | None = None) -> None:
        t = timeout or self.DEFAULT_TIMEOUT
        WebDriverWait(self.driver, t).until(
            EC.text_to_be_present_in_element(locator, text)
        )
