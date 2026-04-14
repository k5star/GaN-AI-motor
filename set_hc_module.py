"""
set_hc_module.py
================
HC-05 / HC-06 / HC-10 / AYMY 相容板 藍牙模組自動設定工具
透過 CH341T (或任何 USB-UART) 完成：
  掃描 COM 埠 → 自動偵測 baud rate & 模組類型 → 修改名稱/密碼/baud → 驗證

目標設定
  藍牙名稱  : LTC8115
  配對密碼  : 1234
  UART baud : 115200

模組類型識別
  HC-06 / AYMY  : AT 回傳 "OK"        / AT+VERSION 回傳 "OKlinvorVx.x" 或 "AYMY Vx.x"
  HC-10 (BLE)   : AT 回傳 "OK+Get:..."  (所有回應皆以 "OK+" 開頭)

HC-06 BAUD code 對照表                HC-10 BAUD code 對照表
  AT+BAUD4 = 9600                       AT+BAUD0 = 9600
  AT+BAUD5 = 19200                      AT+BAUD1 = 19200
  AT+BAUD6 = 38400                      AT+BAUD2 = 38400
  AT+BAUD7 = 57600                      AT+BAUD3 = 57600
  AT+BAUD8 = 115200  ← HC-06目標        AT+BAUD4 = 115200  ← HC-10目標
"""

import sys
import time
import io

# ── Windows 終端機強制 UTF-8 輸出 ───────────────────────────────
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── 環境檢查：pyserial ──────────────────────────────────────────
try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("=" * 60)
    print("  錯誤：未安裝 pyserial")
    print()
    print("  請執行：")
    print("      pip install pyserial")
    print()
    print("  若使用虛擬環境：")
    print("      .venv\\Scripts\\activate")
    print("      pip install pyserial")
    print("=" * 60)
    sys.exit(1)

# ══════════════════════════════════════════════════════════════
#  全域常數
# ══════════════════════════════════════════════════════════════

TARGET_NAME = "LTC8115"
TARGET_PIN  = "1234"
TARGET_BAUD = 115200

# 各模組類型對應的 BAUD 指令碼
BAUD_CODE = {
    "HC-06": "8",   # AT+BAUD8 = 115200
    "AYMY":  "8",   # AT+BAUD8 = 115200 (同 HC-06)
    "HC-10": "4",   # AT+BAUD4 = 115200 (HC-10 BLE 編碼不同)
    "HC-05": None,  # HC-05 用 AT+UART=115200,0,0
}

SCAN_BAUDS   = [9600, 38400, 19200, 57600, 115200, 4800]
READ_TIMEOUT = 2   # 秒

SEP  = "=" * 60
LINE = "-" * 52


# ══════════════════════════════════════════════════════════════
#  工具函式
# ══════════════════════════════════════════════════════════════

def banner(title: str):
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)


def read_response(ser: serial.Serial, wait: float = READ_TIMEOUT) -> bytes:
    """等待 wait 秒，把緩衝區全部讀完後回傳原始 bytes"""
    deadline = time.time() + wait
    buf = b""
    while time.time() < deadline:
        n = ser.in_waiting
        if n:
            buf += ser.read(n)
            time.sleep(0.05)
        else:
            time.sleep(0.02)
    return buf


def send_cmd(ser: serial.Serial,
             cmd: bytes,
             ending: bytes,
             wait: float = READ_TIMEOUT) -> bytes:
    """清緩衝、送指令、回傳原始回應"""
    ser.reset_input_buffer()
    ser.write(cmd + ending)
    return read_response(ser, wait)


def decode_resp(raw: bytes) -> str:
    return raw.decode("utf-8", errors="replace").strip()


def looks_ok(resp: str) -> bool:
    """包含 OK 視為成功（涵蓋 HC-06 的 OK 和 HC-10 的 OK+Set:...）"""
    return "OK" in resp.upper()


def detect_module_type(resp: str) -> str:
    """
    根據 AT / AT+VERSION 回應推斷模組類型：
      HC-10  : 回應含 "OK+"
      AYMY   : 回應含 "AYMY"
      HC-06  : 回應含 "linvor" 或只有 "OK"
      HC-05  : 暫時歸入此類（需 EN/KEY 進 AT 模式）
    """
    upper = resp.upper()
    if "OK+" in upper:
        return "HC-10"
    if "AYMY" in upper:
        return "AYMY"
    if "LINVOR" in upper:
        return "HC-06"
    if "OK" in upper:
        return "HC-06"   # 預設視為 HC-06 相容
    return "UNKNOWN"


def open_port(port: str, baud: int) -> "serial.Serial | None":
    """開啟序列埠，失敗回傳 None"""
    try:
        ser = serial.Serial(port, baudrate=baud, timeout=READ_TIMEOUT)
        return ser
    except serial.SerialException as e:
        print(f"  ✗ 無法開啟 {port}：{e}")
        return None


# ══════════════════════════════════════════════════════════════
#  一、掃描並選擇 COM 埠
# ══════════════════════════════════════════════════════════════

def select_com_port() -> str:
    banner("一、掃描 COM 埠")

    ports = list(serial.tools.list_ports.comports())
    if not ports:
        print("  ✗ 未找到任何序列埠！")
        print()
        print("  請確認：")
        print("    1. CH341T USB 線是否已插入電腦")
        print("    2. CH341 驅動程式是否已安裝")
        print("    3. 裝置管理員中是否有 COM 埠出現")
        sys.exit(1)

    print()
    for i, p in enumerate(ports, 1):
        print(f"  [{i}] {p.device}  -  {p.description}")

    print()
    while True:
        try:
            choice = input("  請輸入編號選擇 COM 埠：").strip()
            idx = int(choice) - 1
            if 0 <= idx < len(ports):
                selected = ports[idx].device
                print(f"  ✓ 已選擇：{selected}")
                return selected
            print(f"  請輸入 1 到 {len(ports)} 之間的數字")
        except ValueError:
            print("  請輸入有效數字")
        except KeyboardInterrupt:
            print("\n  已取消")
            sys.exit(0)


# ══════════════════════════════════════════════════════════════
#  二、自動掃描連線參數 + 偵測模組類型
# ══════════════════════════════════════════════════════════════

def scan_connection(port: str) -> "tuple[int, bytes, str, str] | None":
    """
    自動掃描 baud rate × 換行格式，同時偵測模組類型。
    回傳 (baud, ending_bytes, ending_label, module_type)，全部失敗回傳 None
    """
    banner("二、自動掃描連線參數")
    print(f"  COM 埠：{port}")
    print(f"  掃描 baud：{SCAN_BAUDS}")
    print()

    endings = [
        (b"",     "無換行"),
        (b"\r\n", "+\\r\\n"),
    ]

    for baud in SCAN_BAUDS:
        print(f"  ┌─ Baud {baud} {'─'*38}")
        ser = open_port(port, baud)
        if ser is None:
            print(f"  └{'─'*50}")
            continue

        try:
            for end_bytes, end_label in endings:
                raw = send_cmd(ser, b"AT", end_bytes, wait=READ_TIMEOUT)
                resp = decode_resp(raw)

                if raw:
                    print(f"  │  AT [{end_label}]  →  {resp!r}  ★ 有回應！")

                    # 進一步查詢版本確認模組類型
                    raw_ver = send_cmd(ser, b"AT+VERSION", end_bytes)
                    resp_ver = decode_resp(raw_ver)
                    if raw_ver:
                        print(f"  │  AT+VERSION [{end_label}]  →  {resp_ver!r}")

                    # 整合 AT 和 VERSION 回應判斷模組類型
                    combined = resp + " " + resp_ver
                    mod_type = detect_module_type(combined)
                    print(f"  │  ➜ 偵測到模組類型：{mod_type}")

                    # HC-10 額外查詢
                    if mod_type == "HC-10":
                        raw_name = send_cmd(ser, b"AT+NAME", end_bytes)
                        resp_name = decode_resp(raw_name)
                        if raw_name:
                            print(f"  │  AT+NAME [{end_label}]  →  {resp_name!r}")

                    print(f"  └{'─'*50}")
                    ser.close()
                    return baud, end_bytes, end_label, mod_type
                else:
                    print(f"  │  AT [{end_label}]  →  （無回應）")

        finally:
            if ser.is_open:
                ser.close()

        print(f"  └{'─'*50}")

    # 全部失敗
    print()
    print("  ✗ 所有組合均無回應，請依以下清單排查：")
    print()
    print("    1. TX/RX 接線方向")
    print("       CH341T TXD  →  模組 RXD")
    print("       CH341T RXD  →  模組 TXD")
    print("    2. 是否選錯 COM 埠")
    print("    3. 模組是否已上電（LED 是否有閃爍）")
    print("    4. 若為真正的 HC-05，需將 EN/KEY 拉高後上電才能進 AT 模式")
    print("       成功進入時 LED 每 2 秒慢閃一次")
    print("    5. 模組可能不使用標準 AT 指令格式")
    print("    6. 供電是否穩定（HC 系列需要 3.3V）")
    return None


# ══════════════════════════════════════════════════════════════
#  三、修改模組設定（依模組類型選擇指令）
# ══════════════════════════════════════════════════════════════

def apply_settings(port: str,
                   baud: int,
                   ending: bytes,
                   end_label: str,
                   mod_type: str) -> dict:
    """
    依模組類型送出對應指令：
      HC-10  : AT+NAME / AT+PASS / AT+BAUD4（\r\n 結尾）
      HC-06  : AT+NAMEXXX / AT+PINXXX / AT+BAUD8（無換行）
      AYMY   : 同 HC-06，但寫入 Flash 需要較長 delay
      HC-05  : AT+NAME=XXX / AT+PSWD=XXX / AT+UART=...
    關鍵時序：名稱先送（2.5s）→ 密碼（1.5s）→ BAUD 最後（BAUD 指令會觸發重啟）
    """
    banner("三、修改模組設定")
    print(f"  COM={port}  Baud={baud}  換行={end_label}  模組={mod_type}")
    print()

    results = {
        "name_ok":    False,
        "pin_ok":     False,
        "baud_ok":    False,
        "used_style": mod_type,
    }

    ser = open_port(port, baud)
    if ser is None:
        return results

    def do(cmd_str: str, desc: str, delay: float = READ_TIMEOUT) -> tuple:
        """送出指令，等待 delay 秒，印出並回傳 (回應, 是否OK)"""
        ser.reset_input_buffer()
        ser.write(cmd_str.encode() + ending)
        raw  = read_response(ser, delay)
        resp = decode_resp(raw)
        ok   = looks_ok(resp) if raw else False
        sym  = "✓" if ok else ("？" if raw else "✗")
        print(f"  {sym} [{desc}]")
        print(f"    送出：{cmd_str!r}  換行={end_label}")
        print(f"    收到：{resp!r}" if raw else "    收到：（無回應）")
        print()
        return resp, ok

    try:
        if mod_type == "HC-10":
            # ── HC-10 (BLE) 指令格式 ──────────────────────────────
            # HC-10 回應格式：OK+Set:<value> 或 OK+Get:<value>
            # HC-10 的 AT+BAUD4 = 115200（注意：與 HC-06 的 BAUD8 不同）
            print("  >> HC-10 BLE 模組指令")
            print(f"  {LINE}")

            _, n_ok = do(f"AT+NAME{TARGET_NAME}", "設定名稱 HC-10", delay=2.5)
            _, p_ok = do(f"AT+PASS{TARGET_PIN}",  "設定密碼 HC-10", delay=1.5)
            # BAUD 指令最後送，因為會觸發重啟
            _, b_ok = do("AT+BAUD4",              "設定 baud HC-10 (115200)", delay=1.5)

            results["name_ok"]    = n_ok
            results["pin_ok"]     = p_ok
            results["baud_ok"]    = b_ok

        elif mod_type in ("HC-06", "AYMY"):
            # ── HC-06 / AYMY 指令格式 ─────────────────────────────
            # AYMY 需要更長 delay 等 Flash 寫入完成
            delay_name = 2.5 if mod_type == "AYMY" else 1.5
            print(f"  >> {mod_type} 風格指令（無等號）")
            print(f"  {LINE}")

            _, n_ok = do(f"AT+NAME{TARGET_NAME}",   "設定名稱", delay=delay_name)
            _, p_ok = do(f"AT+PIN{TARGET_PIN}",      "設定密碼", delay=1.5)
            # BAUD 最後送，會觸發重啟
            _, b_ok = do(f"AT+BAUD8",               "設定 baud (115200)", delay=1.5)

            if not (n_ok or p_ok or b_ok):
                # 備用：HC-05 等號格式
                print(f"  >> {mod_type} 格式全無回應，改試 HC-05 等號格式")
                print(f"  {LINE}")
                _, n_ok = do(f"AT+NAME={TARGET_NAME}",     "設定名稱 HC-05", delay=2.5)
                _, p_ok = do(f"AT+PSWD={TARGET_PIN}",      "設定密碼 HC-05", delay=1.5)
                _, b_ok = do(f"AT+UART={TARGET_BAUD},0,0", "設定 baud HC-05", delay=1.5)
                results["used_style"] = "HC-05"

            results["name_ok"] = n_ok
            results["pin_ok"]  = p_ok
            results["baud_ok"] = b_ok

        else:
            # ── 未知 / HC-05 格式 ─────────────────────────────────
            print("  >> 未知模組，依序嘗試 HC-06 → HC-10 → HC-05 格式")
            print(f"  {LINE}")

            # 嘗試順序：HC-06 → HC-10 → HC-05
            styles = [
                ("HC-06", [
                    (f"AT+NAME{TARGET_NAME}",   "設定名稱 HC-06",  2.5),
                    (f"AT+PIN{TARGET_PIN}",      "設定密碼 HC-06",  1.5),
                    ("AT+BAUD8",                 "設定 baud  HC-06", 1.5),
                ]),
                ("HC-10", [
                    (f"AT+NAME{TARGET_NAME}",   "設定名稱 HC-10",  2.5),
                    (f"AT+PASS{TARGET_PIN}",     "設定密碼 HC-10",  1.5),
                    ("AT+BAUD4",                 "設定 baud  HC-10", 1.5),
                ]),
                ("HC-05", [
                    (f"AT+NAME={TARGET_NAME}",     "設定名稱 HC-05",  2.5),
                    (f"AT+PSWD={TARGET_PIN}",       "設定密碼 HC-05",  1.5),
                    (f"AT+UART={TARGET_BAUD},0,0",  "設定 baud  HC-05", 1.5),
                ]),
            ]

            for style_name, cmds in styles:
                print(f"\n  -- 嘗試 {style_name} --")
                any_ok = False
                for cmd, desc, dly in cmds:
                    _, ok = do(cmd, desc, delay=dly)
                    if ok:
                        any_ok = True
                if any_ok:
                    results["used_style"] = style_name
                    results["name_ok"] = True
                    results["pin_ok"]  = True
                    results["baud_ok"] = True
                    break

    finally:
        ser.close()
        print(f"  （已關閉 {port}）")

    return results


# ══════════════════════════════════════════════════════════════
#  四、驗證設定
# ══════════════════════════════════════════════════════════════

def verify_settings(port: str,
                    end_label: str,
                    ending: bytes,
                    mod_type: str) -> dict:
    """
    用 TARGET_BAUD 重新開啟，送 AT / 名稱查詢驗證
    """
    banner("四、修改完成後驗證")
    print(f"  重新用 {TARGET_BAUD} baud 開啟 {port}（模組={mod_type}）…")
    print()

    result = {
        "at_ok":      False,
        "name_match": False,
        "name_found": "",
    }

    time.sleep(1.5)   # 等模組完成重設/重啟
    ser = open_port(port, TARGET_BAUD)
    if ser is None:
        print(f"  ✗ 無法在 {TARGET_BAUD} baud 開啟埠，驗證跳過")
        return result

    def probe(cmd_str: str, dly: float = READ_TIMEOUT) -> str:
        ser.reset_input_buffer()
        ser.write(cmd_str.encode() + ending)
        raw  = read_response(ser, dly)
        resp = decode_resp(raw)
        sym  = "✓" if raw else "✗"
        if raw:
            print(f"  {sym} {cmd_str!r}  →  {resp!r}")
        else:
            print(f"  {sym} {cmd_str!r}  →  （無回應）")
        return resp

    try:
        at_resp = probe("AT")
        result["at_ok"] = looks_ok(at_resp)

        # 名稱查詢（HC-10 用 AT+NAME；HC-06 用 AT+NAME；HC-05 用 AT+NAME?）
        name_resp = probe("AT+NAME")
        if not name_resp:
            name_resp = probe("AT+NAME?")

        result["name_found"] = name_resp

        if TARGET_NAME.upper() in name_resp.upper():
            result["name_match"] = True
            print(f"  ★ 名稱確認為 {TARGET_NAME} ✓")
        elif name_resp:
            print(f"  △ 回應中未看到 {TARGET_NAME}，請手動用手機搜尋確認")
        else:
            print(f"  ✗ 未取得名稱回應")

        probe("AT+VERSION")

    finally:
        ser.close()
        print(f"\n  （已關閉 {port}）")

    return result


# ══════════════════════════════════════════════════════════════
#  五、最終摘要
# ══════════════════════════════════════════════════════════════

def print_summary(port: str,
                  init_baud: int,
                  end_label: str,
                  mod_type: str,
                  set_results: dict,
                  ver_results: dict):
    banner("最終摘要")
    print()

    def row(label: str, value: str):
        print(f"  {label:<28}：{value}")

    row("使用 COM 埠",            port)
    row("偵測到的模組類型",       mod_type)
    row("掃描找到的初始 baud",    str(init_baud))
    row("掃描找到的換行格式",     end_label)
    row("使用的指令風格",         set_results.get("used_style", "未知"))
    row("修改後 baud rate",       str(TARGET_BAUD))
    row("名稱修改",
        "✓ 成功" if set_results["name_ok"]   else "△ 未確認（請手動驗證）")
    row("密碼修改",
        "✓ 已送出" if set_results["pin_ok"]  else "△ 未確認（請手動驗證）")
    row("Baud 修改",
        "✓ 已送出" if set_results["baud_ok"] else "△ 未確認（請手動驗證）")
    row("驗證：AT 回應",
        "✓ 正常" if ver_results["at_ok"]     else "✗ 無回應")
    row("驗證：名稱是否為 LTC8115",
        "✓ 確認" if ver_results["name_match"] else "△ 未確認（建議手機搜尋）")

    print()
    print(f"  {LINE}")
    print("  ⚠  注意事項")
    print(f"  {LINE}")

    if mod_type == "HC-10":
        print("  ★ 此模組為 HC-10 BLE（藍牙低功耗），")
        print("     手機需使用 BLE App（如 nRF Connect）搜尋，")
        print("     不會出現在傳統藍牙配對清單中。")
        print()

    print("  1. 模組需要斷電再上電，新名稱才會生效")
    print("  2. 手機若曾配對過舊名稱，請先刪除舊配對再重新搜尋")
    print(f"  3. 之後通訊 UART baud rate 請改為 {TARGET_BAUD}")
    print(f"  4. 配對密碼：{TARGET_PIN}")
    print()
    print(SEP)


# ══════════════════════════════════════════════════════════════
#  主程式
# ══════════════════════════════════════════════════════════════

def main():
    banner("HC 藍牙模組自動設定工具（支援 HC-05 / HC-06 / HC-10 / AYMY）")
    print(f"  目標名稱  : {TARGET_NAME}")
    print(f"  目標密碼  : {TARGET_PIN}")
    print(f"  目標 baud : {TARGET_BAUD}")

    # 一、選擇 COM 埠
    port = select_com_port()

    # 二、自動掃描連線參數 + 偵測模組類型
    scan_result = scan_connection(port)
    if scan_result is None:
        print("\n  程式結束：請依上方建議排查後重新執行。")
        sys.exit(1)

    init_baud, ending_bytes, ending_label, mod_type = scan_result
    print(f"\n  ✓ 使用組合：Baud={init_baud}  換行={ending_label}  模組={mod_type}")

    # 三、修改設定
    set_results = apply_settings(port, init_baud, ending_bytes,
                                 ending_label, mod_type)

    # 四、驗證
    ver_results = verify_settings(port, ending_label, ending_bytes, mod_type)

    # 五、摘要
    print_summary(port, init_baud, ending_label, mod_type,
                  set_results, ver_results)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n  已由使用者中斷，程式結束。")
        sys.exit(0)
