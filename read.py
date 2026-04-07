from pymodbus.client import ModbusSerialClient

client = ModbusSerialClient(
    port='COM3',
    baudrate=115200,
    parity='N',
    stopbits=1,
    bytesize=8
)

client.connect()

result = client.read_holding_registers(
    address=0x0103,
    count=1,
    device_id=28
)

print(result.registers)

client.close()