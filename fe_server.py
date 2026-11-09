#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static Frontend Server for ZMM220 Web Console (Port 8099)
with automatic Fallback Demo API on Port 8098 when real backend is not running.
"""
import json
import os
import socket
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))
HOST = "127.0.0.1"
PORT = 8099
API_PORT = 8098


class FrontendHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, format, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/csl/check", "/csl/login"):
            self.path = "/index.html"
        elif parsed.path == "/mobile":
            self.path = "/mobile.html"
        return super().do_GET()


# ---------------- In-Memory Demo Store for Port 8098 (UI Check Mode) ----------------
DEMO_STORE = {
    "users": [
        {"uid": 1, "user_id": "1", "name": "Super Admin", "privilege": 14, "role": 14, "card": 0, "password": "888", "hex": "01000e53757065722041646d696e00000000000000000000"},
        {"uid": 12, "user_id": "7441083", "name": "Trần Kim Thịnh", "privilege": 0, "role": 0, "card": 10971784, "password": "", "hex": "0c00005472616e204b696d205468696e68000000886a6700"},
        {"uid": 15, "user_id": "7441021", "name": "Nguyễn Văn An", "privilege": 0, "role": 0, "card": 10971205, "password": "", "hex": "0f00004e677579656e2056616e20416e0000000045686700"},
        {"uid": 18, "user_id": "7441055", "name": "Lê Thị Bích Ngọc", "privilege": 0, "role": 0, "card": 10971442, "password": "", "hex": "1200004c65205468692042696368204e676f630032696700"},
        {"uid": 22, "user_id": "7441092", "name": "Phạm Minh Tuấn", "privilege": 2, "role": 2, "card": 10971890, "password": "", "hex": "1600025068616d204d696e68205475616e000000f26a6700"},
        {"uid": 25, "user_id": "7441104", "name": "Hoàng Quốc Việt", "privilege": 0, "role": 0, "card": 10971912, "password": "", "hex": "190000486f616e672051756f6320566965740000086b6700"},
        {"uid": 29, "user_id": "7441118", "name": "Đỗ Thu Trang", "privilege": 0, "role": 0, "card": 10971988, "password": "", "hex": "1d0000446f20546875205472616e670000000000546b6700"},
    ],
    "days": [
        {"date": "2026-11-09", "display_date": "09/11/2026", "weekday": "Thứ 2", "is_today": True, "is_weekend": False, "is_future": False, "status": "missing_out", "has_in": True, "has_out": False, "first_in": "08:23:00", "last_out": None, "duration_str": None, "next_action": "check_out", "suggested_out": "17:45:00"},
        {"date": "2026-11-08", "display_date": "08/11/2026", "weekday": "Chủ nhật", "is_today": False, "is_weekend": True, "is_future": False, "status": "weekend", "has_in": False, "has_out": False, "first_in": None, "last_out": None, "duration_str": None, "next_action": "none"},
        {"date": "2026-11-07", "display_date": "07/11/2026", "weekday": "Thứ 7", "is_today": False, "is_weekend": True, "is_future": False, "status": "weekend", "has_in": False, "has_out": False, "first_in": None, "last_out": None, "duration_str": None, "next_action": "none"},
        {"date": "2026-11-06", "display_date": "06/11/2026", "weekday": "Thứ 6", "is_today": False, "is_weekend": False, "is_future": False, "status": "missing_out", "has_in": True, "has_out": False, "first_in": "08:26:12", "last_out": None, "duration_str": None, "next_action": "check_out", "suggested_out": "17:46:18"},
        {"date": "2026-11-05", "display_date": "05/11/2026", "weekday": "Thứ 5", "is_today": False, "is_weekend": False, "is_future": False, "status": "absent", "has_in": False, "has_out": False, "first_in": None, "last_out": None, "duration_str": None, "next_action": "check_in", "suggested_in": "08:22:15"},
        {"date": "2026-11-04", "display_date": "04/11/2026", "weekday": "Thứ 4", "is_today": False, "is_weekend": False, "is_future": False, "status": "complete", "has_in": True, "has_out": True, "first_in": "08:21:44", "last_out": "17:48:05", "duration_str": "8h 26p", "next_action": "none"},
        {"date": "2026-11-03", "display_date": "03/11/2026", "weekday": "Thứ 3", "is_today": False, "is_weekend": False, "is_future": False, "status": "complete", "has_in": True, "has_out": True, "first_in": "08:19:10", "last_out": "17:45:32", "duration_str": "8h 26p", "next_action": "none"},
        {"date": "2026-11-02", "display_date": "02/11/2026", "weekday": "Thứ 2", "is_today": False, "is_weekend": False, "is_future": False, "status": "complete", "has_in": True, "has_out": True, "first_in": "08:24:51", "last_out": "17:50:12", "duration_str": "8h 25p", "next_action": "none"},
        {"date": "2026-11-10", "display_date": "10/11/2026", "weekday": "Thứ 3", "is_today": False, "is_weekend": False, "is_future": True, "status": "future", "has_in": False, "has_out": False, "first_in": None, "last_out": None, "duration_str": None, "next_action": "none"},
        {"date": "2026-11-11", "display_date": "11/11/2026", "weekday": "Thứ 4", "is_today": False, "is_weekend": False, "is_future": True, "status": "future", "has_in": False, "has_out": False, "first_in": None, "last_out": None, "duration_str": None, "next_action": "none"},
    ],
    "thinh_late": [
        {"date": "2026-11-06", "weekday": "Thứ 6", "orig_late_in": "08:41:19", "first_in": "08:41:19", "late_str": "11 phút", "suggested_time": "08:22:14", "has_early_on_machine": False, "fixed_in_session": False},
        {"date": "2026-11-03", "weekday": "Thứ 3", "orig_late_in": "08:36:50", "first_in": "08:36:50", "late_str": "6 phút", "suggested_time": "08:24:08", "has_early_on_machine": False, "fixed_in_session": False},
        {"date": "2026-10-29", "weekday": "Thứ 5", "orig_late_in": "08:52:10", "first_in": "08:52:10", "late_str": "22 phút", "suggested_time": "08:21:33", "has_early_on_machine": False, "fixed_in_session": False},
        {"date": "2026-10-27", "weekday": "Thứ 3", "orig_late_in": "08:39:05", "first_in": "08:20:15", "early_in": "08:20:15", "late_str": "9 phút", "suggested_time": "08:20:15", "has_early_on_machine": True, "fixed_in_session": False},
    ],
    "others_late": [
        {"date": "2026-11-05", "weekday": "Thứ 5", "first_in": "08:44:12", "late_str": "14 phút", "suggested_time": "08:23:19", "fixed_in_session": False},
        {"date": "2026-11-02", "weekday": "Thứ 2", "first_in": "08:35:08", "late_str": "5 phút", "suggested_time": "08:21:45", "fixed_in_session": False},
    ],
    "records": [
        {"index": 14674, "seq": 1, "user_id": "7441083", "name": "Trần Kim Thịnh", "date": "2026-11-09", "datetime": "2026-11-09 08:23:00", "timestamp": 846922980, "status": 4, "punch": 0, "is_first": True, "is_late": False, "hex": "0c0037343431303833000000000000000000000000000000000004a4287b320000000000"},
        {"index": 14675, "seq": 2, "user_id": "7441021", "name": "Nguyễn Văn An", "date": "2026-11-09", "datetime": "2026-11-09 08:41:19", "timestamp": 846924079, "status": 4, "punch": 0, "is_first": True, "is_late": True, "hex": "0f0037343431303231000000000000000000000000000000000004ef2c7b320000000000"},
        {"index": 14676, "seq": 3, "user_id": "7441055", "name": "Lê Thị Bích Ngọc", "date": "2026-11-09", "datetime": "2026-11-09 08:19:45", "timestamp": 846922785, "status": 1, "punch": 0, "is_first": True, "is_late": False, "hex": "120037343431303535000000000000000000000000000000000001e1277b320000000000"},
        {"index": 14677, "seq": 4, "user_id": "7441092", "name": "Phạm Minh Tuấn", "date": "2026-11-09", "datetime": "2026-11-09 08:36:50", "timestamp": 846923810, "status": 4, "punch": 0, "is_first": True, "is_late": True, "hex": "160037343431303932000000000000000000000000000000000004e22b7b320000000000"},
        {"index": 14678, "seq": 5, "user_id": "7441083", "name": "Trần Kim Thịnh", "date": "2026-11-06", "datetime": "2026-11-06 08:41:19", "timestamp": 846664879, "status": 4, "punch": 0, "is_first": True, "is_late": True, "hex": "0c00373434313038330000000000000000000000000000000000046f3877320000000000"},
        {"index": 14679, "seq": 6, "user_id": "7441083", "name": "Trần Kim Thịnh", "date": "2026-11-06", "datetime": "2026-11-06 17:48:05", "timestamp": 846697685, "status": 4, "punch": 1, "is_first": False, "is_late": False, "hex": "0c003734343130383300000000000000000000000000000000000495b877320100000000"},
        {"index": 14680, "seq": 7, "user_id": "7441104", "name": "Hoàng Quốc Việt", "date": "2026-11-06", "datetime": "2026-11-06 08:21:12", "timestamp": 846663672, "status": 4, "punch": 0, "is_first": True, "is_late": False, "hex": "190037343431313034000000000000000000000000000000000004b83377320000000000"},
    ],
    "warp": {
        "active": False,
        "user_id": "7441083",
        "user_name": "Trần Kim Thịnh",
        "target_dt_str": "",
        "queue": [],
        "expires_at": 0,
        "last_swipe_msg": "Hệ thống sẵn sàng (Chế độ Demo UI)",
    },
    "records_count": 14681,
    "history": [
        "[14:30:05] Khởi tạo kết nối ZKTeco ZMM220 (TCP 4370) — OK",
        "[14:30:06] Đọc bộ đệm ssrattlog.dat: 14,681 bản ghi 40-Byte",
        "[14:30:06] Đọc bộ đệm ssruser.dat: 220 hồ sơ 72-Byte",
    ],
    "desktop_state": {
        "target_ip": "192.168.54.250",
        "target_port": 4370,
        "pending_changes": 0,
        "last_pull_at": "2026-11-09 14:30:05",
        "last_push_at": "2026-11-09 13:55:12",
        "protocol_log": [
            "[14:30:05] CONNECT 192.168.54.250:4370 (CMD_CONNECT 1000) -> ACK_OK (SessionID: 0x4A91)",
            "[14:30:05] CMD_AUTHComKey (1102, Key=0) -> ACK_OK",
            "[14:30:05] CMD_DISABLEDEVICE (1003) -> ACK_OK",
            "[14:30:06] READ_LARGE_DATASET ssruser.dat (DataType=1,72B) -> 15,840 bytes (220 users)",
            "[14:30:06] READ_LARGE_DATASET ssrattlog.dat (DataType=1,40B) -> 587,240 bytes (14,681 records)",
            "[14:30:06] CMD_ENABLEDEVICE (1002) & CMD_EXIT (1001) -> ACK_OK",
        ],
    },
}


class DemoApiHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, obj, status=200):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return {}

    def do_OPTIONS(self):
        self._send_json({"ok": True})

    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        now = datetime.now()
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
        p = parsed.path

        if p == "/api/users":
            return self._send_json({"ok": True, "users": DEMO_STORE["users"]})

        if p == "/api/time/timesheet":
            completed = sum(1 for d in DEMO_STORE["days"] if d["status"] == "complete") + 16
            need_fix = sum(1 for d in DEMO_STORE["days"] if d["status"] in ("missing_out", "absent", "missing_in"))
            return self._send_json({
                "ok": True,
                "cycle": "2026-11",
                "cycle_label": "Tháng 11/2026 (25/10 → 24/11)",
                "available_cycles": [
                    {"cycle": "2026-11", "label": "Tháng 11/2026 (25/10 → 24/11)"},
                    {"cycle": "2026-10", "label": "Tháng 10/2026 (25/09 → 24/10)"},
                    {"cycle": "2026-09", "label": "Tháng 09/2026 (25/08 → 24/09)"},
                ],
                "summary": {
                    "total_working_days": 22,
                    "completed_days": completed,
                    "missing_days": need_fix,
                    "absent_days": 0,
                    "attendance_rate": round((completed / 22) * 100),
                },
                "days": DEMO_STORE["days"],
            })

        if p == "/api/time/late-days":
            uid = (qs.get("user_id") or ["7441083"])[0]
            late_list = DEMO_STORE["thinh_late"] if uid == "7441083" else DEMO_STORE["others_late"]
            return self._send_json({"ok": True, "late_days": late_list})

        if p == "/api/time/status":
            w = DEMO_STORE["warp"]
            rem = 0
            if w["active"]:
                rem = max(0, int(w["expires_at"] - time.time()))
                if rem <= 0:
                    w["active"] = False
            dev_time = w["target_dt_str"] if w["active"] else now_str
            return self._send_json({
                "ok": True,
                "device_time": dev_time,
                "records_count": DEMO_STORE["records_count"],
                "warp": {
                    "active": w["active"],
                    "user_name": w["user_name"],
                    "target_dt_str": w["target_dt_str"],
                    "remaining_sec": rem,
                    "last_swipe_msg": w["last_swipe_msg"],
                },
                "history": DEMO_STORE["history"],
            })

        if p == "/api/attendance":
            d_filter = (qs.get("date") or [""])[0]
            u_filter = (qs.get("user") or ["ALL"])[0]
            l_filter = (qs.get("late") or ["0"])[0]
            recs = list(DEMO_STORE["records"])
            if d_filter:
                recs = [r for r in recs if r["date"] == d_filter]
            if u_filter and u_filter != "ALL":
                recs = [r for r in recs if r["user_id"] == u_filter]
            if l_filter == "1":
                recs = [r for r in recs if r["is_late"]]
            return self._send_json({
                "ok": True,
                "records": recs,
                "users": DEMO_STORE["users"],
                "monotonic_ok": True,
                "file_size_bytes": 14681 * 40,
                "total_in_file": 14681,
                "state": DEMO_STORE["desktop_state"],
            })

        return self._send_json({"ok": True})

    def do_POST(self):
        parsed = urlparse(self.path)
        p = parsed.path
        body = self._read_body()
        now_time = datetime.now().strftime("%H:%M:%S")
        now_date = datetime.now().strftime("%Y-%m-%d")

        if p == "/api/auth/login":
            return self._send_json({"ok": True, "token": "demo-ui-token", "username": body.get("username") or "admin"})

        if p == "/api/time/warp-queue":
            queue = body.get("queue") or [{"date": now_date, "target_datetime": f"{now_date} 08:22:15"}]
            uid = str(body.get("user_id") or "7441083")
            u_obj = next((u for u in DEMO_STORE["users"] if str(u["user_id"]) == uid), DEMO_STORE["users"][1])
            w = DEMO_STORE["warp"]
            w["active"] = True
            w["user_id"] = uid
            w["user_name"] = u_obj["name"]
            w["target_dt_str"] = queue[0].get("target_datetime", f"{now_date} 08:22:15")
            w["queue"] = queue
            w["expires_at"] = time.time() + int(body.get("duration_sec") or 30)
            DEMO_STORE["history"].append(f"[{now_time}] TUA GIỜ MÁY → {w['target_dt_str']} (Chờ {u_obj['name']} quẹt thẻ)")
            return self._send_json({"ok": True})

        if p == "/api/emulator/simulate-swipe":
            w = DEMO_STORE["warp"]
            for q in w.get("queue", []):
                q_date = q.get("date")
                t_part = (q.get("target_datetime") or "2026-11-09 08:22:15").split(" ")[-1]
                for d in DEMO_STORE["days"]:
                    if d["date"] == q_date:
                        if d["status"] == "missing_out":
                            d["last_out"] = t_part
                            d["has_out"] = True
                            d["status"] = "complete"
                            d["duration_str"] = "8h 22p"
                            d["next_action"] = "none"
                        else:
                            d["first_in"] = t_part
                            d["has_in"] = True
                            d["status"] = "missing_out"
                            d["next_action"] = "check_out"
                            d["suggested_out"] = "17:45:00"
                for lt in DEMO_STORE["thinh_late"] + DEMO_STORE["others_late"]:
                    if lt["date"] == q_date:
                        lt["fixed_in_session"] = True
                        lt["fixed_at"] = q.get("target_datetime") or f"{q_date} {t_part}"
            w["active"] = False
            w["last_swipe_msg"] = f"Đã quẹt thẻ bù thành công ({w['target_dt_str']}) & trả giờ chuẩn!"
            DEMO_STORE["records_count"] += 1
            DEMO_STORE["history"].append(f"[{now_time}] QUẸT THẺ THÀNH CÔNG ({w['target_dt_str']}) → Đã khôi phục giờ thực")
            return self._send_json({"ok": True})

        if p == "/api/time/restore":
            DEMO_STORE["warp"]["active"] = False
            DEMO_STORE["history"].append(f"[{now_time}] Đã huỷ tua giờ & khôi phục đồng hồ chuẩn NTP")
            return self._send_json({"ok": True})

        if p == "/api/door/unlock":
            DEMO_STORE["warp"]["last_swipe_msg"] = f"Đã kích hoạt mở khóa cửa từ trong 5 giây ({now_time})"
            DEMO_STORE["history"].append(f"[{now_time}] UNLOCK DOOR (CMD_UNLOCK 5s) → Thành công")
            return self._send_json({"ok": True})

        if p == "/api/attendance/patch":
            idx = int(body.get("index") or 0)
            for r in DEMO_STORE["records"]:
                if r["index"] == idx:
                    dt = body.get("datetime") or r["datetime"]
                    r["datetime"] = dt
                    r["date"] = dt[:10]
                    r["is_late"] = r["is_first"] and dt[11:19] > "08:30:00"
                    r["status"] = int(body.get("status", r["status"]))
                    r["punch"] = int(body.get("punch", r["punch"]))
                    DEMO_STORE["desktop_state"]["pending_changes"] += 1
            return self._send_json({"ok": True})

        if p == "/api/attendance/insert":
            uid = str(body.get("user_id") or "7441083")
            u_obj = next((u for u in DEMO_STORE["users"] if str(u["user_id"]) == uid), DEMO_STORE["users"][1])
            dt = body.get("datetime") or f"{now_date} 08:22:15"
            next_idx = max((r["index"] for r in DEMO_STORE["records"]), default=14680) + 1
            DEMO_STORE["records"].insert(0, {
                "index": next_idx,
                "seq": len(DEMO_STORE["records"]) + 1,
                "user_id": uid,
                "name": u_obj["name"],
                "date": dt[:10],
                "datetime": dt,
                "timestamp": 846925000 + next_idx,
                "status": int(body.get("status", 4)),
                "punch": int(body.get("punch", 0)),
                "is_first": True,
                "is_late": dt[11:19] > "08:30:00",
                "hex": "0c0037343431303833000000000000000000000000000000000004a4287b320000000000",
            })
            DEMO_STORE["desktop_state"]["pending_changes"] += 1
            return self._send_json({"ok": True})

        if p == "/api/users/save":
            uid = int(body.get("uid") or 0)
            existing = next((u for u in DEMO_STORE["users"] if int(u["uid"]) == uid), None)
            if existing:
                existing.update(body)
            else:
                DEMO_STORE["users"].append({**body, "role": body.get("privilege", 0), "hex": "1a00004e6577205573657200000000000000000000000000"})
            return self._send_json({"ok": True})

        if p == "/api/4370/pull":
            return self._send_json({"ok": True, "users_count": 220, "records_count": 14681, "bytes": 587240, "elapsed_sec": 0.42})

        if p == "/api/4370/push":
            DEMO_STORE["desktop_state"]["pending_changes"] = 0
            return self._send_json({"ok": True, "total_records": 14681, "merged_new_swipes": 2, "elapsed_sec": 0.68})

        return self._send_json({"ok": True})


def start_demo_api_if_needed():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind((HOST, API_PORT))
        sock.close()
    except OSError:
        # Port 8098 is already served by real backend
        return
    api_server = HTTPServer((HOST, API_PORT), DemoApiHandler)
    t = threading.Thread(target=api_server.serve_forever, daemon=True)
    t.start()
    print(f"[ZMM220-DEMO-API] Companion Demo Backend running on http://{HOST}:{API_PORT}")


if __name__ == "__main__":
    start_demo_api_if_needed()
    print(f"[ZMM220-FE] Frontend Static Server running on http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), FrontendHandler).serve_forever()
