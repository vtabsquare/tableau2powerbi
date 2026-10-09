from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_full_registration_otp_password_and_login_flow():
    test_email = "newuser_automated@example.com"
    test_pwd = "AutomatedSecurePassword123!"

    # 1. Request registration OTP
    reg_res = client.post("/api/auth/register-request", json={"email": test_email})
    assert reg_res.status_code == 200
    reg_json = reg_res.json()
    assert reg_json["status"] == "success"
    otp = reg_json.get("dev_otp")
    assert otp is not None
    assert len(otp) == 6

    # 2. Verify invalid OTP fails
    inv_res = client.post("/api/auth/verify-otp", json={"email": test_email, "otp": "000000"})
    assert inv_res.status_code == 400

    # 3. Verify valid OTP succeeds
    ver_res = client.post("/api/auth/verify-otp", json={"email": test_email, "otp": otp})
    assert ver_res.status_code == 200
    assert ver_res.json()["requires_password_creation"] is True

    # 4. Create Password
    create_res = client.post("/api/auth/create-password", json={
        "email": test_email,
        "otp": otp,
        "password": test_pwd
    })
    assert create_res.status_code == 200
    assert create_res.json()["authenticated"] is True

    # 5. Login with newly created password
    login_res = client.post("/api/auth/login", json={
        "username": test_email,
        "password": test_pwd
    })
    assert login_res.status_code == 200
    assert login_res.json()["authenticated"] is True
    assert login_res.json()["display_name"] == test_email

    # 6. Login with incorrect password fails
    bad_login = client.post("/api/auth/login", json={
        "username": test_email,
        "password": "IncorrectPassword"
    })
    assert bad_login.status_code == 401


def test_demo_login_fallback():
    demo_res = client.post("/api/auth/login", json={
        "username": "balamuraleee@gmail.com",
        "password": "12345"
    })
    assert demo_res.status_code == 200
    assert demo_res.json()["authenticated"] is True
