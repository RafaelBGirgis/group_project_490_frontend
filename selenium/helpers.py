import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.edge.options import Options


FRONTEND_URL = "http://localhost:5173"
CLIENT_EMAIL = "rat8@njit.edu"
CLIENT_PASSWORD = "password"


def wait_for_page_to_fully_load(driver, timeout=10):
    wait = WebDriverWait(driver, timeout)

    wait.until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )

    wait.until(
        lambda d: d.execute_script(
            """
            const images = Array.from(document.images);
            return images.every(img => img.complete);
            """
        )
    )

    time.sleep(2)

def scroll(driver, direction, pause=0.3, step=350):
    """
    Scroll slowly in the given direction.

    direction:
        "down" - scroll from current position to bottom
        "up"   - scroll from current position to top
    """
    direction = direction.lower()

    if direction == "down":
        page_height = driver.execute_script("return document.body.scrollHeight")
        current_position = driver.execute_script("return window.scrollY")

        while current_position < page_height:
            current_position += step
            driver.execute_script(f"window.scrollTo(0, {current_position});")

            page_height = driver.execute_script("return document.body.scrollHeight")
            time.sleep(pause)

    elif direction == "up":
        current_position = driver.execute_script("return window.scrollY")

        while current_position > 0:
            current_position -= step

            if current_position < 0:
                current_position = 0

            driver.execute_script(f"window.scrollTo(0, {current_position});")
            time.sleep(pause)

    else:
        raise ValueError("direction must be either 'down' or 'up'")

def createDriver():
    edge_options = Options()
    edge_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    edge_options.add_argument("--log-level=3")
    driver = webdriver.Edge(options=edge_options)

    return driver

def login(driver):
    """Log in as a client"""
    try:
        wait = WebDriverWait(driver, 10)

        # Navigate to landing page
        print("Opening landing page...")
        driver.get(FRONTEND_URL)

        # Wait for page to load - every element in the page needs to load
        print("Waiting for landing page to fully load...")
        wait.until(EC.presence_of_element_located((By.LINK_TEXT, "Log in")))
        print("Landing page loaded successfully")

        # Click the login link in the navbar
        print("Clicking login link...")
        login_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Log in"))
        )

        previous_url = driver.current_url
        login_link.click()

        # Wait for login page to load
        wait.until(lambda d: d.current_url != previous_url)
        print("Navigated to login page")

        print(f"[✓] Successfully navigated to login page: {driver.current_url}")

        # Verify login page has expected elements
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))
        print("[✓] Login form is present on the page")

        # Enter client login credentials
        print("Entering client login credentials...")

        email_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
        )
        password_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
        )

        email_input.clear()
        email_input.send_keys(CLIENT_EMAIL)

        password_input.clear()
        password_input.send_keys(CLIENT_PASSWORD)

        # Submit login form
        print("Submitting login form...")
        previous_url = driver.current_url

        submit_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        )
        submit_button.click()

        # Wait for dashboard page to load
        wait.until(lambda d: d.current_url != previous_url)
        wait_for_page_to_fully_load(driver)

        current_url = driver.current_url
        assert "/client" in current_url, (
            f"Expected URL to contain '/client', got: {current_url}"
        )

        print(f"[✓] Successfully logged in and navigated to dashboard: {current_url}")

    except Exception as e:
        print(f"[x] Login failed: {e}\n")
        raise
    finally:
        print("Finished Logging In")

    
def printSuccess(string):
    GREEN = "\033[32m"
    RESET = "\033[0m"
    print(f"{GREEN}[✓]{RESET} {string}")