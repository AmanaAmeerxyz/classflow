import streamlit as st
import sqlite3
import hashlib
from datetime import datetime, timedelta

try:
    from streamlit_autorefresh import st_autorefresh
except ImportError:
    st_autorefresh = None


# ============================================================
# CLASSALERT
# A Python-only prototype for a college hackathon
# ============================================================


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="ClassAlert",
    page_icon="🔔",
    layout="centered"
)


# ============================================================
# DATABASE
# ============================================================

DATABASE = "classalert.db"


def get_connection():

    conn = sqlite3.connect(
        DATABASE,
        check_same_thread=False
    )

    return conn


def create_database():

    conn = get_connection()

    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            role TEXT NOT NULL,

            department TEXT NOT NULL,

            class_name TEXT NOT NULL,

            room TEXT NOT NULL

        )
    """)

    # Notifications table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            department TEXT NOT NULL,

            class_name TEXT NOT NULL,

            teacher_name TEXT NOT NULL,

            notification_type TEXT NOT NULL,

            message TEXT NOT NULL,

            created_at TEXT NOT NULL

        )
    """)

    conn.commit()

    conn.close()


create_database()


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(password):

    return hashlib.sha256(
        password.encode()
    ).hexdigest()


# ============================================================
# CUSTOM CSS
# ============================================================

st.markdown("""
<style>

.main {

    background-color: #f6f7ff;

}


/* Main title */

.logo {

    font-size: 42px;

    font-weight: 800;

    text-align: center;

    margin-top: 20px;

    margin-bottom: 5px;

}


.logo span {

    color: #635bff;

}


.tagline {

    text-align: center;

    color: #777;

    margin-bottom: 35px;

}


/* Cards */

.card {

    background: white;

    padding: 25px;

    border-radius: 20px;

    margin-bottom: 20px;

    box-shadow:
        0px 5px 25px rgba(0,0,0,0.06);

}


/* Coming notification */

.coming {

    background:
        linear-gradient(
            135deg,
            #635bff,
            #805cff
        );

    color: white;

    padding: 25px;

    border-radius: 20px;

    margin-top: 20px;

}


/* Late notification */

.late {

    background: #fff4dc;

    padding: 22px;

    border-radius: 20px;

    border-left: 5px solid #ffb020;

    margin-top: 15px;

}


/* Status */

.status {

    padding: 15px;

    border-radius: 15px;

    background: #f0efff;

    margin-top: 15px;

}


/* Buttons */

.stButton > button {

    border-radius: 12px;

    font-weight: 600;

    min-height: 45px;

}


/* Hide Streamlit branding */

#MainMenu {

    visibility: hidden;

}


footer {

    visibility: hidden;

}

</style>
""", unsafe_allow_html=True)


# ============================================================
# SESSION STATE
# ============================================================

if "logged_in" not in st.session_state:

    st.session_state.logged_in = False


if "user" not in st.session_state:

    st.session_state.user = None


if "page" not in st.session_state:

    st.session_state.page = "login"


# ============================================================
# LOGIN FUNCTION
# ============================================================

def login_user(email, password):

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            email,
            role,
            department,
            class_name,
            room

        FROM users

        WHERE email = ?
        AND password = ?

    """, (
        email,
        hash_password(password)
    ))

    user = cursor.fetchone()

    conn.close()

    return user


# ============================================================
# REGISTER USER
# ============================================================

def register_user(
    name,
    email,
    password,
    role,
    department,
    class_name,
    room
):

    conn = get_connection()

    cursor = conn.cursor()

    try:

        cursor.execute("""
            INSERT INTO users
            (
                name,
                email,
                password,
                role,
                department,
                class_name,
                room
            )

            VALUES (?, ?, ?, ?, ?, ?, ?)

        """, (

            name,
            email,
            hash_password(password),
            role,
            department,
            class_name,
            room

        ))

        conn.commit()

        return True, "Account created successfully!"

    except sqlite3.IntegrityError:

        return False, "This email is already registered."

    finally:

        conn.close()


# ============================================================
# SEND NOTIFICATION
# ============================================================

def send_notification(
    department,
    class_name,
    teacher_name,
    notification_type,
    message
):

    conn = get_connection()

    cursor = conn.cursor()

    current_time = datetime.now().strftime(
        "%d %b %Y, %I:%M %p"
    )

    cursor.execute("""
        INSERT INTO notifications
        (
            department,
            class_name,
            teacher_name,
            notification_type,
            message,
            created_at
        )

        VALUES (?, ?, ?, ?, ?, ?)

    """, (

        department,
        class_name,
        teacher_name,
        notification_type,
        message,
        current_time

    ))

    conn.commit()

    conn.close()


# ============================================================
# GET NOTIFICATIONS
# ============================================================

def get_notifications(
    department,
    class_name
):

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            teacher_name,
            notification_type,
            message,
            created_at

        FROM notifications

        WHERE department = ?

        AND class_name = ?

        ORDER BY id DESC

        LIMIT 20

    """, (

        department,
        class_name

    ))

    notifications = cursor.fetchall()

    conn.close()

    return notifications


# ============================================================
# LOGOUT
# ============================================================

def logout():

    st.session_state.logged_in = False

    st.session_state.user = None

    st.session_state.page = "login"

    st.rerun()


# ============================================================
# APP HEADER
# ============================================================

def app_header():

    st.markdown(
        '<div class="logo">🔔 Class<span>Alert</span></div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="tagline">'
        'Know when your teacher is coming.'
        '</div>',
        unsafe_allow_html=True
    )


# ============================================================
# LOGIN / REGISTER PAGE
# ============================================================

def login_page():

    app_header()

    tab1, tab2 = st.tabs(
        ["🔐 Login", "📝 Create Account"]
    )


    # ========================================================
    # LOGIN
    # ========================================================

    with tab1:

        st.markdown(
            "### Welcome back 👋"
        )

        role = st.radio(
            "Login as",
            ["Student", "Teacher"],
            horizontal=True
        )


        email = st.text_input(
            "Email",
            placeholder="example@college.com"
        )


        password = st.text_input(
            "Password",
            type="password"
        )


        if st.button(
            "Login →",
            use_container_width=True
        ):

            if not email or not password:

                st.error(
                    "Please enter email and password."
                )

            else:

                user = login_user(
                    email,
                    password
                )


                if user is None:

                    st.error(
                        "Invalid email or password."
                    )

                elif user[3].lower() != role.lower():

                    st.error(
                        f"This account is registered as a "
                        f"{user[3]}."
                    )

                else:

                    st.session_state.logged_in = True

                    st.session_state.user = {

                        "id": user[0],

                        "name": user[1],

                        "email": user[2],

                        "role": user[3],

                        "department": user[4],

                        "class_name": user[5],

                        "room": user[6]

                    }

                    st.rerun()


    # ========================================================
    # REGISTER
    # ========================================================

    with tab2:

        st.markdown(
            "### Create your ClassAlert account"
        )


        role = st.selectbox(
            "I am a",
            ["Student", "Teacher"]
        )


        name = st.text_input(
            "Full Name",
            key="register_name"
        )


        email = st.text_input(
            "Email",
            key="register_email"
        )


        password = st.text_input(
            "Password",
            type="password",
            key="register_password"
        )


        department = st.selectbox(
            "Department",
            [
                "Computer Science & Engineering",
                "Artificial Intelligence",
                "Electronics & Communication",
                "Electrical & Electronics",
                "Mechanical Engineering",
                "Civil Engineering"
            ]
        )


        class_name = st.selectbox(
            "Class",
            [
                "S1 CSE A",
                "S1 CSE B",
                "S2 CSE A",
                "S1 AI A",
                "S1 ECE A",
                "S1 EEE A",
                "S1 ME A",
                "S1 CE A"
            ]
        )


        room = st.text_input(
            "Room Number",
            placeholder="Example: C-203"
        )


        if st.button(
            "Create Account",
            use_container_width=True
        ):

            if not name:

                st.error("Enter your name.")

            elif not email:

                st.error("Enter your email.")

            elif not password:

                st.error("Create a password.")

            elif not room:

                st.error("Enter the classroom.")

            else:

                success, message = register_user(

                    name,
                    email,
                    password,
                    role,
                    department,
                    class_name,
                    room

                )


                if success:

                    st.success(message)

                    st.info(
                        "You can now login using the Login tab."
                    )

                else:

                    st.error(message)


# ============================================================
# STUDENT DASHBOARD
# ============================================================

def student_dashboard():

    user = st.session_state.user

    # Automatically refresh every 3 seconds if package is available
    if st_autorefresh is not None:
        st_autorefresh(
            interval=3000,
            key="student_refresh"
        )


    # Header

    col1, col2 = st.columns(
        [4, 1]
    )


    with col1:

        st.markdown(
            "## 🔔 ClassAlert"
        )

        st.caption(
            f"Welcome, {user['name']}"
        )


    with col2:

        if st.button("Logout"):

            logout()


    # Student information

    st.markdown(
        f"""
        <div class="card">

        <h3>👋 Good morning, {user['name']}</h3>

        <p>
        <b>Department:</b> {user['department']}
        </p>

        <p>
        <b>Class:</b> {user['class_name']}
        </p>

        <p>
        <b>Room:</b> 📍 {user['room']}
        </p>

        </div>
        """,
        unsafe_allow_html=True
    )


    # Next class

    st.markdown(
        """
        <div class="card">

        <small>NEXT CLASS</small>

        <h2>📐 Engineering Mathematics</h2>

        <p>👨‍🏫 Your Teacher</p>

        <p>⏰ Scheduled Class</p>

        </div>
        """,
        unsafe_allow_html=True
    )


    # Get notifications

    notifications = get_notifications(

        user["department"],

        user["class_name"]

    )


    st.markdown(
        "### 🔔 Notifications"
    )


    if not notifications:

        st.info(
            "No notifications yet. "
            "You're all caught up!"
        )

    else:

        for notification in notifications:

            teacher_name = notification[0]

            notification_type = notification[1]

            message = notification[2]

            created_at = notification[3]


            # Teacher coming

            if notification_type == "coming":

                st.markdown(
                    f"""
                    <div class="coming">

                    <h3>
                    🚶 Get Ready!
                    </h3>

                    <h2>
                    Teacher is Coming
                    </h2>

                    <p>
                    {message}
                    </p>

                    <small>
                    👨‍🏫 {teacher_name}
                    &nbsp; • &nbsp;
                    {created_at}
                    </small>

                    </div>
                    """,
                    unsafe_allow_html=True
                )


            # Teacher late

            elif notification_type == "late":

                st.markdown(
                    f"""
                    <div class="late">

                    <h3>
                    ⏰ Class Delayed
                    </h3>

                    <p>
                    {message}
                    </p>

                    <small>
                    👨‍🏫 {teacher_name}
                    &nbsp; • &nbsp;
                    {created_at}
                    </small>

                    </div>
                    """,
                    unsafe_allow_html=True
                )


            # General notification

            else:

                st.info(message)


# ============================================================
# TEACHER DASHBOARD
# ============================================================

def teacher_dashboard():

    user = st.session_state.user


    col1, col2 = st.columns(
        [4, 1]
    )


    with col1:

        st.markdown(
            "## 🔔 ClassAlert"
        )

        st.caption(
            "Teacher Dashboard"
        )


    with col2:

        if st.button("Logout"):

            logout()


    # Teacher information

    st.markdown(
        f"""
        <div class="card">

        <h3>
        👨‍🏫 Good morning, {user['name']}
        </h3>

        <p>
        <b>Department:</b>
        {user['department']}
        </p>

        <p>
        <b>Class:</b>
        {user['class_name']}
        </p>

        <p>
        <b>Room:</b>
        📍 {user['room']}
        </p>

        </div>
        """,
        unsafe_allow_html=True
    )


    # Current class

    st.markdown(
        "### 📚 Your Next Class"
    )


    st.markdown(
        f"""
        <div class="card">

        <h2>
        📐 Engineering Mathematics
        </h2>

        <p>
        🎓 Class: <b>{user['class_name']}</b>
        </p>

        <p>
        📍 Room: <b>{user['room']}</b>
        </p>

        <p>
        ⏰ Scheduled Time: <b>10:00 AM</b>
        </p>

        </div>
        """,
        unsafe_allow_html=True
    )


    # Main action

    st.markdown(
        "### 📢 Notify Your Students"
    )


    st.write(
        "Tell your students when you are on your way."
    )


    # GET READY BUTTON

    if st.button(
        "🚶 GET READY — TEACHER IS COMING",
        use_container_width=True
    ):

        send_notification(

            user["department"],

            user["class_name"],

            user["name"],

            "coming",

            "Your teacher is on the way. "
            "Please return to the classroom. "
            "Class will begin soon."

        )


        st.success(
            "🔔 All students in this class "
            "have been notified!"
        )


    # LATE BUTTON

    if st.button(
        "⏰ I'M LATE — GIVE STUDENTS +10 MINUTES",
        use_container_width=True
    ):

        new_time = (
            datetime.now()
            + timedelta(minutes=10)
        ).strftime(
            "%I:%M %p"
        )


        send_notification(

            user["department"],

            user["class_name"],

            user["name"],

            "late",

            f"Your teacher is running late. "
            f"You have 10 extra minutes. "
            f"Expected class start: {new_time}."

        )


        st.warning(
            "⏰ Students have been given "
            "+10 minutes."
        )


    # How it works

    st.markdown(
        "### 💡 How ClassAlert Works"
    )


    st.markdown(
        """
        <div class="card">

        <p>🟣 <b>1.</b> Teacher presses
        "Get Ready"</p>

        <p>🔔 <b>2.</b> Students receive
        an instant notification</p>

        <p>🎓 <b>3.</b> Students return
        to the classroom</p>

        <p>⏰ <b>4.</b> If the teacher is late,
        students receive extra time</p>

        </div>
        """,
        unsafe_allow_html=True
    )


# ============================================================
# MAIN APPLICATION
# ============================================================

if not st.session_state.logged_in:

    login_page()

else:

    if st.session_state.user["role"].lower() == "student":

        student_dashboard()

    else:

        teacher_dashboard()