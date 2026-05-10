import tkinter
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.edge.options import Options
from selenium.common.exceptions import (
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
)


FRONTEND_URL = "http://localhost:5173"
ADMIN_EMAIL = "rat8@njit.edu"
CLIENT_EMAIL = "janedoe@gmail.com"
DEFAULT_PFP_URL = "https://upload.wikimedia.org/wikipedia/en/e/e9/New_Jersey_IT_seal.svg"
DEFAULT_ONBOARDING_BIO = "This is a Selenium onboarding test account, onboarding bio."

def createDriver():
    # Get screen size
    root = tkinter.Tk()
    root.withdraw()

    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()

    edge_options = Options()
    edge_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    edge_options.add_argument("--log-level=3")
    driver = webdriver.Edge(options=edge_options)

    # Modify these to change size/location of browser
    browser_width = screen_width // 2
    browser_height = screen_height

    x = 0
    y = 0

    driver.set_window_rect(
        x=x,
        y=y,
        width=browser_width,
        height=browser_height
    )

    driver.get("https://example.com")

    return driver

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

    try:
        profile_text = driver.find_element(
            By.XPATH, "//button[@title='Open Profile']"
        ).text.strip()

        if profile_text == "?":
            wait.until(
                lambda d: d.find_element(
                    By.XPATH, "//button[@title='Open Profile']"
                ).text.strip() not in ("", "?")
            )
    except (Exception):
        pass

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

def login(driver, email=CLIENT_EMAIL):
    """Logs into an existing user, execution stops after reaching '/client'"""

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
        login_link.click()

        # Wait for login page to load
        wait.until(EC.url_contains("/login"))
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
        email_input.send_keys(email)

        password_input.clear()
        password_input.send_keys("password")

        # Submit login form
        print("Submitting login form...")
        submit_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        )
        submit_button.click()

        # Accounts can land on different dashboards depending on role state.
        # Normalize the test flow by always redirecting to the client dashboard.
        wait.until(
            lambda d: any(
                route in d.current_url for route in ("/client", "/coach", "/admin")
            )
        )
        driver.get(f"{FRONTEND_URL}/client")
        wait.until(EC.url_contains("/client"))
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

def signup(
    driver,
    name="John Doe",
    email=None,
    age="25",
    onboarding_gender="male",
    password="password",
):
    """Creates a brand new user, execution stops after reaching '/client'"""

    try:
        print("Creating brand new user...")
        wait = WebDriverWait(driver, 10)

        # Navigate to landing page
        driver.get(FRONTEND_URL)

        # Click the signup link in the navbar
        signup_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Get started"))
        )
        signup_link.click()

        # Wait for signup page to load
        wait.until(EC.url_contains("/signup"))
        wait.until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )

        # ------------------------------------------SIGN UP HERE------------------------------------------
        # Current signup page only collects name, email, and password fields.
        name_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='name']"))
        )
        email_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='email']"))
        )
        password_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='password']"))
        )
        confirm_password_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='confirmPassword']"))
        )

        if email is None:
            email = f"johndoe_{int(time.time())}@email.com"

        name_input.clear()
        name_input.send_keys(name)

        email_input.clear()
        email_input.send_keys(email)

        password_input.clear()
        password_input.send_keys(password)

        confirm_password_input.clear()
        confirm_password_input.send_keys(password)

        # Submit signup form
        submit_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        )
        submit_button.click()

        # Wait for onboarding page to load
        wait.until(EC.url_contains("/onboarding"))
        wait.until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )

        # ------------------------------------------ONBOARDING------------------------------------------
        # Select primary goal
        primary_goal_select = Select(
            wait.until(
                EC.presence_of_element_located(
                    (By.XPATH, "//select[option[contains(., 'Select a primary goal')]]")
                )
            )
        )
        primary_goal_select.select_by_visible_text("Muscle Gain")

        # Fill baseline metrics
        age_input = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "input[placeholder='Age (13–120)']")
            )
        )

        age_input.clear()
        age_input.send_keys("25")

        weight_input = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//input[contains(@placeholder, 'Weight in lbs')]")
            )
        )

        weight_input.clear()
        weight_input.send_keys("165")

        # Select gender
        gender_select = Select(
            wait.until(
                EC.presence_of_element_located(
                    (By.XPATH, "//select[option[contains(., 'Gender')]]")
                )
            )
        )
        gender_select.select_by_value(onboarding_gender)

        # Optional bio
        bio_input = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "textarea[placeholder='Tell us about yourself! (optional)']")
            )
        )
        bio_input.clear()
        bio_input.send_keys(DEFAULT_ONBOARDING_BIO)

        # --------------------------------------AVAILABILITY--------------------------------------
        try:
            add_availability_button = wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//button[normalize-space()='+ Add availability']")
                )
            )
            add_availability_button.click()

            start_time_input = wait.until(
                EC.presence_of_element_located(
                    (By.XPATH, "(//input[@type='time'])[1]")
                )
            )
            end_time_input = wait.until(
                EC.presence_of_element_located(
                    (By.XPATH, "(//input[@type='time'])[2]")
                )
            )

            start_time_input.clear()
            start_time_input.send_keys("08:00")

            end_time_input.clear()
            end_time_input.send_keys("16:00")

            add_availability_submit = wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//button[normalize-space()='Add availability']")
                )
            )
            add_availability_submit.click()

            wait.until(
                EC.presence_of_element_located(
                    (
                        By.XPATH,
                        "//div[@role='button' and contains(@title, 'Click to delete')]",
                    )
                )
            )

        except TimeoutException:
            raise AssertionError(
                "Could not create an onboarding availability window in the calendar."
            )

        # Fill payment information
        card_number_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='Card number']"))
        )
        card_cvv_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='CVV']"))
        )
        card_expiry_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='month']"))
        )

        card_number_input.clear()
        card_number_input.send_keys("38310694570788")

        card_cvv_input.clear()
        card_cvv_input.send_keys("097")

        card_expiry_input.click()
        driver.execute_script(
            """
            const input = arguments[0];
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            ).set;
            nativeSetter.call(input, '2027-12');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur();
            """,
            card_expiry_input,
        )
        wait.until(
            lambda d: d.find_element(
                By.CSS_SELECTOR, "input[type='month']"
            ).get_attribute("value") == "2027-12"
        )

        # Submit onboarding form
        submit_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(., 'Complete Onboarding')]")
            )
        )

        # Make sure the button is actually enabled
        assert submit_button.is_enabled(), "Complete Onboarding button is disabled"
        submit_button.click()

        # Wait for client dashboard page to load
        wait.until(EC.url_contains("/client"))
        wait_for_page_to_fully_load(driver)

        print("Successfully created brand new user")
    
    except Exception as e:
        printFailure(f"Test failed: {e} \n")
        raise


def delete_account(driver, timeout=10):
    """Delete the current account, then wait until the login page is visible."""

    wait = WebDriverWait(driver, timeout)

    print("Opening profile page...")
    open_profile_button = wait.until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "button[title='Open Profile']")
        )
    )
    open_profile_button.click()

    wait.until(EC.url_contains("/profile"))
    wait_for_page_to_fully_load(driver, timeout=timeout)

    print("Deleting account...")
    delete_account_button = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Delete Account']")
        )
    )
    delete_account_button.click()

    delete_account_alert = wait.until(EC.alert_is_present())
    delete_account_alert.accept()

    account_deleted_alert = wait.until(EC.alert_is_present())
    account_deleted_alert.accept()

    wait.until(EC.url_contains("/login"))
    wait_for_page_to_fully_load(driver, timeout=timeout)
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))

    printSuccess(
        f"Successfully deleted account and returned to: {driver.current_url}"
    )

def printNotice(string):
    TURQUOISE = "\033[36m"
    RESET = "\033[0m"
    print(f"{TURQUOISE}[!]{RESET} {string}")

def printSuccess(string):
    GREEN = "\033[32m"
    RESET = "\033[0m"
    print(f"{GREEN}[✓]{RESET} {string}")

def printFailure(string):
    RED = "\033[31m"
    RESET = "\033[0m"
    print(f"{RED}[x]{RESET} {string}")

def printCongratulation(string):
    YELLOW = "\033[33m"
    RESET = "\033[0m"
    print(f"{YELLOW}[*]{RESET} {string}")
