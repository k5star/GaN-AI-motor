"""
HC-05 / HC-06 / 4-pin 藍牙模組 — 自動掃描 baud rate 測試腳本
自動測試所有 baud rate × 指令 × 換行格式，找出可用組合
"""

import sys
import time
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

try:
    import serial
except ImportError:
    print("錯誤：未安裝 pyserial")
    print("請執行：pip install pyserial")
    sys.exit(1)

# ── 設定區 ─────────────────────────────────────────────
PORT      = "COM16"
TIMEOUT   = 2          # 秒

BAUD_LIST = [9600, 38400, 19200, 57600, 115200, 4800]

# (顯示名稱, bytes)
COMMANDS = [
    ("AT",         b"AT"),
    ("AT+VERSION?",b"AT+VERSION?"),
    ("AT+NAME?",   b"AT+NAME?"),
]

# 兩種換行格式
ENDINGS = [
    ("(無換行)",  b""),
    ("(+\\r\\n)", b"\r\n"),
]

SEP_WIDE   = "=" * 60
SEP_NARROW = "-" * 52
# ──────────────────────────────────────────────────────


def read_response(ser: "serial.Serial") -> bytes:
    """送出後最多等 TIMEOUT 秒，把所有回應讀完"""
    deadline = time.time() + TIMEOUT
    buf = b""
    while time.time() < deadline:
        waiting = ser.in_waiting
        if waiting:
            buf += ser.read(waiting)
            # 有資料後再給 50 ms 看看還有沒有後續
            time.sleep(0.05)
        else:
            time.sleep(0.02)
    return buf


def send_cmd(ser, cmd_bytes: bytes, ending_bytes: bytes):
    """清緩衝、送指令、讀回應"""
    ser.reset_input_buffer()
    ser.write(cmd_bytes + ending_bytes)
    return read_response(ser)


def run_scan():
    print(SEP_WIDE)
    print("  HC-05 / HC-06 藍牙模組自動掃描測試")
    print(f"  目標埠：{PORT}  ／  timeout：{TIMEOUT} 秒")
    print(SEP_WIDE)

    success_list = []   # 記錄所有有回應的組合

    for baud in BAUD_LIST:
        print(f"\n{'━'*60}")
        print(f"  Baud Rate：{baud}")
        print(f"{'━'*60}")

        try:
            ser = serial.Serial(PORT, baudrate=baud, timeout=TIMEOUT)
        except serial.SerialException as e:
            print(f"  ✗ 無法開啟 {PORT}：{e}")
            continue

        try:
            for cmd_name, cmd_bytes in COMMANDS:
                for end_name, end_bytes in ENDINGS:
                    label = f"{cmd_name} {end_name}"
                    raw = send_cmd(ser, cmd_bytes, end_bytes)

                    if raw:
                        text = raw.decode("utf-8", errors="replace").strip()
                        print(f"  送出：{label}")
                        print(f"  收到：{text!r}")
                        print(f"  ★ 有回應！")
                        print(f"  {SEP_NARROW}")
                        success_list.append({
                            "baud":  baud,
                            "cmd":   cmd_name,
                            "end":   end_name,
                            "reply": text,
                        })
                    else:
                        print(f"  送出：{label}")
                        print(f"  收到：（無回應）")
                        print(f"  {SEP_NARROW}")
        finally:
            ser.close()

    # ── 總結 ──────────────────────────────────────────
    print(f"\n{SEP_WIDE}")
    print("  掃描完成 — 總結")
    print(SEP_WIDE)

    if success_list:
        print(f"\n  ✅ 共找到 {len(success_list)} 個有回應的組合：\n")
        for i, r in enumerate(success_list, 1):
            print(f"  [{i}] Baud {r['baud']:>6}  指令: {r['cmd']:<16} 換行: {r['end']}")
            print(f"       回應: {r['reply']!r}")
        print()
        print("  >> 建議使用上方第一個成功組合作為正式通訊設定。")
        print("  >> 若模組在「一般模式」就能回應 AT，")
        print("     很可能是 HC-06 或相容板，不需要拉高 EN/KEY。")
    else:
        print()
        print("  ✗ 所有組合均無回應")
        print()
        print("  可能原因：")
        print()
        print("  1. 可能不支援一般模式 AT 指令")
        print("     → 真正的 HC-05 需先進入 AT 模式")
        print("       方法：將 EN / KEY (pin34) 接 3.3V，斷電後再上電")
        print("       成功進入時 LED 每 2 秒慢閃一次")
        print()
        print("  2. 可能需要 EN / KEY 進 AT 模式（無法不接線解決）")
        print("     → 建議換「帶板載按鍵」的 HC-05，")
        print("       按住按鍵上電即可進入 AT 模式，無需額外接線")
        print()
        print("  3. 可能是相容板而非標準 HC-05 / HC-06")
        print("     → 部分副廠模組 AT 指令集不同，")
        print("       可嘗試：AT、AT\r、AT\n 或查閱模組規格書")
        print()
        print("  4. TX / RX 接反")
        print("     CH341T TXD  →  HC-05 RXD")
        print("     CH341T RXD  →  HC-05 TXD")
        print()
        print("  5. 供電問題：確認 VCC=3.3V、GND 已共地")


if __name__ == "__main__":
    run_scan()
