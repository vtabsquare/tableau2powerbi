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
    assert demo_res.json().get("can_use_demo_flow") is False

    # Test vtab public demo account
    vtab_demo_res = client.post("/api/auth/login", json={
        "username": "vtabpublicuser@gmail.com",
        "password": "Demo@12345"
    })
    assert vtab_demo_res.status_code == 200
    vtab_json = vtab_demo_res.json()
    assert vtab_json["authenticated"] is True
    assert vtab_json["can_use_demo_flow"] is True
    assert vtab_json.get("token") is not None

    # Test session endpoint
    sess_res = client.get("/api/auth/session", headers={"Authorization": f"Bearer {vtab_json['token']}"})
    assert sess_res.status_code == 200
    assert sess_res.json()["can_use_demo_flow"] is True

    # Test unauthorized account blocked from demo file load
    unauth_token = demo_res.json().get("token")
    if unauth_token:
        blocked_res = client.post("/api/projects/demo", headers={"Authorization": f"Bearer {unauth_token}"})
        assert blocked_res.status_code == 403

    # Test demo user loading demo project succeeds, but export is locked with 403
    demo_load_res = client.post("/api/projects/demo", headers={"Authorization": f"Bearer {vtab_json['token']}"})
    if demo_load_res.status_code == 200:
        demo_proj_id = demo_load_res.json()["project_id"]
        demo_export_res = client.post(f"/api/projects/{demo_proj_id}/export", headers={"Authorization": f"Bearer {vtab_json['token']}"})
        assert demo_export_res.status_code == 403
        assert "locked in the demo version" in demo_export_res.json().get("detail", "")


def test_direct_access_demo_session_endpoint():
    # 1. GET /api/auth/demo-session provides instant direct access without credentials
    demo_sess_get = client.get("/api/auth/demo-session")
    assert demo_sess_get.status_code == 200
    data_get = demo_sess_get.json()
    assert data_get["authenticated"] is True
    assert data_get["is_demo_mode"] is True
    assert data_get["can_use_demo_flow"] is True
    assert "token" in data_get
    demo_token = data_get["token"]

    # 2. POST /api/auth/demo-session also works
    demo_sess_post = client.post("/api/auth/demo-session")
    assert demo_sess_post.status_code == 200
    assert demo_sess_post.json()["authenticated"] is True

    # 3. Direct demo project load with X-Access-Mode: demo
    direct_load = client.post("/api/projects/demo", headers={"X-Access-Mode": "demo"})
    assert direct_load.status_code == 200
    project = direct_load.json()
    assert "project_id" in project
    assert "Enterprise_Retail_Operations_Demo" in project.get("project_name", "")

    # 4. Direct demo token allows project validation
    val_res = client.post(f"/api/projects/{project['project_id']}/validate", headers={"Authorization": f"Bearer {demo_token}"})
    assert val_res.status_code == 200

    # 5. Export on demo mode is locked
    export_res = client.post(
        f"/api/projects/{project['project_id']}/export",
        headers={"Authorization": f"Bearer {demo_token}", "X-Access-Mode": "demo"}
    )
    assert export_res.status_code == 403
    assert "locked in the demo version" in export_res.json().get("detail", "")
