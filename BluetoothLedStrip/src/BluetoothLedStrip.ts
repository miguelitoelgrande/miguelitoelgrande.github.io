export namespace BluetoothLedStrip
{
	export enum Method
	{
		RGB = 0x03,
		SWITCH = 0x04,
		MODE = 0x07,
		BRIGHTNESS = 0x08,
		SPEED = 0x09,
	};

	export enum DeviceType
	{
		UNKNOWN,
		MAGIC_STRIP,
		LED_NET_WF,
		KEEP_SMILE,
	};

	const guidServiceMagicStrip: string = '0000fff0-0000-1000-8000-00805f9b34fb';
	const guidCharacteristicMagicStrip: string = '0000fff1-0000-1000-8000-00805f9b34fb';

	const guidServiceLedNetWf: string = '0000ffff-0000-1000-8000-00805f9b34fb';
	const guidCharacteristicLedNetWf: string = '0000ff01-0000-1000-8000-00805f9b34fb';

	const guidServiceKeepsmile: string = '0000afd0-0000-1000-8000-00805f9b34fb';
	const guidCharacteristicKeepsmile: string = '0000afd1-0000-1000-8000-00805f9b34fb';

	export class Device
	{
		deviceType: DeviceType = DeviceType.UNKNOWN;
		counter = 0;
		lastMode: number = 1;
		lastBrightness: number = 100;
		lastSpeed: number = 100;
		characteristic: any = undefined;
		onError?: (exception: any) => void = undefined;
		onConnect?: (device: any) => void = undefined;
		onDisconnect?: (device: any) => void = undefined;

		async connect(onConnect?: (device: any) => void, onDisconnect?: (device: any) => void, onError?: (exception: any) => void)
		{
			// save callback function
			this.onConnect = onConnect!;
			this.onDisconnect = onDisconnect!;
			this.onError = onError!;

			try
			{
				// select device which supports the service
				const options = { filters: [ 	{ services: [guidServiceMagicStrip] },
														{ namePrefix: 'LEDnetWF' },
														{ namePrefix: 'KS03' }
													],
										optionalServices: [guidServiceLedNetWf, guidServiceKeepsmile] };
				const device = await (window.navigator as any).bluetooth.requestDevice(options);

				if (device != undefined)
					console.log('Selected device: ' + device.name + ', Connected: ' + device.gatt.connected);

				// register device disconnect event
				device?.addEventListener('gattserverdisconnected', this.onDisconnected);
				if (device != undefined)
					device.bluetoothLedStripDevice = this;

				// connect to device
				const server = await device?.gatt.connect();

				// get service
				var service = undefined;
				try
				{
					//
					// DeviceType.MAGIC_STRIP
					//
					var service = await server?.getPrimaryService(guidServiceMagicStrip);
					this.deviceType = DeviceType.MAGIC_STRIP

					// get characteristic
					this.characteristic = await service?.getCharacteristic(guidCharacteristicMagicStrip);
				}
				catch (exception)
				{
					try
					{
						//
						// DeviceType.LED_NET_WF
						//
						service = await server?.getPrimaryService(guidServiceLedNetWf);
						this.deviceType = DeviceType.LED_NET_WF

						// get characteristic
						this.characteristic = await service?.getCharacteristic(guidCharacteristicLedNetWf);
					}
					catch (exception)
					{
						//
						// DeviceType.KEEP_SMILE
						//
						service = await server?.getPrimaryService(guidServiceKeepsmile);
						this.deviceType = DeviceType.KEEP_SMILE

						// get characteristic
						this.characteristic = await service?.getCharacteristic(guidCharacteristicKeepsmile);
					}
				}

				// call connect callback
				if (device != undefined)
					if (this.onConnect != undefined)
						this.onConnect(device);
			}
			catch (exception)
			{
				console.log(exception);

				if (this.onError != undefined)
					this.onError(exception);
			}
		}

		sendMagicStrip(method: Method, data: Uint8Array)
		{
			if (this.characteristic == undefined)
				return;

			try
			{
				// send byte stream to characteristic
				this.characteristic.writeValueWithoutResponse(new Uint8Array([ method, ...data ])).then((_: any) =>
				{
				});
			}
			catch (exception)
			{
				console.log(exception);
			}
		}

		sendLedNetWf(magic: Array<number>, data: Uint8Array)
		{
			if (this.characteristic == undefined)
				return;

			try
			{
				// based on https://github.com/8none1/zengge_lednetwf
				const checksum = 0;

				this.counter++;

				const length = magic.length + data.length;

				const packet = new Uint8Array([	((this.counter >> 8) & 0xFF),
															(this.counter & 0xFF),
															... [ 0x80, 0x00, 0x00 ],
															length,
															(length + 1),
															... Uint8Array.from(magic),
															...data,
															checksum ]);

				// send byte stream to characteristic
				this.characteristic.writeValueWithoutResponse(packet).then((_: any) =>
				{
				});
			}
			catch (exception)
			{
				console.log(exception);
			}
		}

		// based on https://github.com/themooer1/cheshire/blob/master/cheshire/hal/compilers/ks03_new/platform_commands.py
		sendKeepsmile(data: Uint8Array)
		{
			if (this.characteristic == undefined)
				return;

			try
			{
				// send byte stream to characteristic
				this.characteristic.writeValueWithoutResponse(new Uint8Array([ ...data ])).then((_: any) =>
				{
				});
			}
			catch (exception)
			{
				console.log(exception);
			}
		}

		// connvert rgb to hsv
		// based on https://stackoverflow.com/a/54070620
		// due to unknown reason, red and green must be swapped
		// Hue is divided by two to fit in to a single byte, Saturation and Value are percentages from 0 to 100
		rgb2hsv(red: number, green: number, blue: number)
		{
			red /= 255;
			green /= 255;
			blue /= 255;

			let v = Math.max(red, green, blue)
			let c = v - Math.min(red, green, blue);

			let h = c && ((v == green) ? (red - blue) / c : ((v == red) ? 2 + (blue - green) / c : 4 + (green - red) / c));

			return [(60 * (h < 0 ? h + 6 : h)) / 2, (v && c / v) * 100, v * 100];
		}

		// set rgb value
		setRGB(red: number, green: number, blue: number)
		{
			if (this.deviceType == DeviceType.MAGIC_STRIP)
				this.sendMagicStrip(Method.RGB, new Uint8Array([red, green, blue]));
			else if (this.deviceType == DeviceType.LED_NET_WF)
			{
				const hsv = this.rgb2hsv(red, green, blue);
				this.sendLedNetWf([ 0x0B, 0x3B ], new Uint8Array([0xA1, ... Uint8Array.from(hsv), ... new Uint8Array(7)]));
			}
			else if (this.deviceType == DeviceType.KEEP_SMILE)
				this.sendKeepsmile(new Uint8Array([0x5A, 0x00, 0x01, red, green, blue, 0x00, this.lastBrightness, 0x00, 0xA5]));
		}

		// set switch
		setSwitch(switchBoolean: number)
		{
			if (this.deviceType == DeviceType.MAGIC_STRIP)
				this.sendMagicStrip(Method.SWITCH, new Uint8Array([switchBoolean]));
			else if (this.deviceType == DeviceType.LED_NET_WF)
				this.sendLedNetWf([ 0x0B, 0x3B ], new Uint8Array([((switchBoolean > 0) ? 0x23 : 0x24), ... new Uint8Array(10)]));
			else if (this.deviceType == DeviceType.KEEP_SMILE)
				this.sendKeepsmile(new Uint8Array([0x5B, ((switchBoolean > 0) ? 0xF0 : 0x0F), 0x00, 0xB5]));
		}

		// set mode
		setMode(mode: number)
		{
			this.lastMode = mode;

			if (this.deviceType == DeviceType.MAGIC_STRIP)
				this.sendMagicStrip(Method.MODE, new Uint8Array([mode]));
			else if (this.deviceType == DeviceType.LED_NET_WF)
				this.sendLedNetWf([ 0x0B, 0x38 ], new Uint8Array([this.lastMode, this.lastSpeed, this.lastBrightness]));
			else if (this.deviceType == DeviceType.KEEP_SMILE)
				this.sendKeepsmile(new Uint8Array([0x5C, 0x00, (this.lastMode + 128), this.lastSpeed, this.lastBrightness, 0x00, 0xC5]));
		}

		// set brightness
		setBrightness(brightness: number)
		{
			this.lastBrightness = brightness;

			if (this.deviceType == DeviceType.MAGIC_STRIP)
				this.sendMagicStrip(Method.BRIGHTNESS, new Uint8Array([brightness]));
			else if (this.deviceType == DeviceType.LED_NET_WF)
				this.sendLedNetWf([ 0x0B, 0x38 ], new Uint8Array([this.lastMode, this.lastSpeed, this.lastBrightness]));
			else if (this.deviceType == DeviceType.KEEP_SMILE)
				this.sendKeepsmile(new Uint8Array([0x5C, 0x00, (this.lastMode + 128), this.lastSpeed, this.lastBrightness, 0x00, 0xC5]));
		}

		// set speed
		setSpeed(speed: number)
		{
			this.lastSpeed = speed;

			if (this.deviceType == DeviceType.MAGIC_STRIP)
				this.sendMagicStrip(Method.SPEED, new Uint8Array([speed]));
			else if (this.deviceType == DeviceType.LED_NET_WF)
				this.sendLedNetWf([ 0x0B, 0x38 ], new Uint8Array([this.lastMode, this.lastSpeed, this.lastBrightness]));
			else if (this.deviceType == DeviceType.KEEP_SMILE)
				this.sendKeepsmile(new Uint8Array([0x5C, 0x00, (this.lastMode + 128), this.lastSpeed, this.lastBrightness, 0x00, 0xC5]));
		}

		// device disconnect event callback
		onDisconnected(event: Event)
		{
			const device = event.target as any;

			console.log(`Device ${device?.name} is disconnected.`);

			// call disconnect callback
			if (device != undefined)
				if (device.bluetoothLedStripDevice.onDisconnect != undefined)
					device.bluetoothLedStripDevice.onDisconnect(device);
		}
	}
 }
