let gBuffer = null


document.body.onload = () =>
{
	const inputFile = document.getElementById("inputFile")
	inputFile.onchange = () =>
	{
		if (inputFile.files.length != 1)
			return
		
		let reader = new FileReader()
		reader.readAsArrayBuffer(inputFile.files[0])
		
		reader.onload = () =>
		{
			gBuffer = new Uint8Array(reader.result)
			gBuffer.readByteAt = (addr) => gBuffer[16 + addr - 0x8000]
			gBuffer.readChrByteAt = (addr) => gBuffer[16 + 0x8000 + addr]
			refresh()
		}
	}
}


document.getElementById("inputWorldNum").onchange = () => refresh()
document.getElementById("inputAreaNum") .onchange = () => refresh()
document.getElementById("checkboxDebug").onchange = () => refresh()


function check(buffer)
{
	console.log(buffer)
	
	for (let i = 0; i < buffer.length; i++)
	{
		if (buffer[i + 0] == 0x1f &&
			buffer[i + 1] == 0x06 &&
			buffer[i + 2] == 0x1c &&
			buffer[i + 3] == 0x00)
			{
				console.log("found at 0x" + (i - 16 + 0x8000).toString(16))
			}
	}
}


function refresh()
{
	if (gBuffer == null)
		return
	
	const worldNum = parseInt(document.getElementById("inputWorldNum").value)
	const areaNum = parseInt(document.getElementById("inputAreaNum").value)
	const drawDebug = document.getElementById("checkboxDebug").checked
	renderLevel(document.getElementById("canvasMain"), worldNum - 1, areaNum - 1, drawDebug)
}


function renderLevel(canvas, worldNum, areaNum, drawDebug)
{
	const worldAddrOffsetsLabel = 0x9cb4
	const areaAddrOffsetsLabel = 0x9cbc
	const enemyDataHOffsetsLabel = 0x9ce0
	const enemyDataAddrLowLabel = 0x9ce4
	const enemyDataAddrHighLabel = 0x9ce4 + 0x22
	const areaDataHOffsetsLabel = 0x9d28
	const areaDataAddrLowLabel = 0x9d2c
	const areaDataAddrHighLabel = 0x9d2c + 0x22
	
	const worldAddrOffset = gBuffer.readByteAt(worldAddrOffsetsLabel + worldNum)
	const areaMainByte = gBuffer.readByteAt(areaAddrOffsetsLabel + worldAddrOffset + areaNum)
	
	const areaType = (areaMainByte & 0b01100000) >> 5
	const areaOffset = (areaMainByte & 0b00011111)
	
	const areaDataOffset = gBuffer.readByteAt(areaDataHOffsetsLabel + areaType)
	const areaDataPtr =
		(gBuffer.readByteAt(areaDataAddrHighLabel + areaDataOffset + areaOffset) << 8) |
		(gBuffer.readByteAt(areaDataAddrLowLabel  + areaDataOffset + areaOffset) << 0)
		
	const enemyDataOffset = gBuffer.readByteAt(enemyDataHOffsetsLabel + areaType)
	const enemyDataPtr =
		(gBuffer.readByteAt(enemyDataAddrHighLabel + enemyDataOffset + areaOffset) << 8) |
		(gBuffer.readByteAt(enemyDataAddrLowLabel  + enemyDataOffset + areaOffset) << 0)
		
	console.log("level " + worldNum + " - " + areaNum)
	console.log("worldAddrOffset = " + worldAddrOffset.toString(16))
	console.log("areaMainByte = " + areaMainByte.toString(16))
	console.log("areaType = " + areaType.toString(16))
	console.log("areaOffset = " + areaOffset.toString(16))
	console.log("areaDataOffset = " + areaDataOffset.toString(16))
	console.log("areaData = ")
	console.log(gBuffer.readByteAt(areaDataPtr + 0).toString(16))
	console.log(gBuffer.readByteAt(areaDataPtr + 1).toString(16))
	console.log(gBuffer.readByteAt(areaDataPtr + 2).toString(16))
	console.log(gBuffer.readByteAt(areaDataPtr + 3).toString(16))
	console.log(gBuffer.readByteAt(areaDataPtr + 4).toString(16))
	console.log("enemyData = ")
	console.log(gBuffer.readByteAt(enemyDataPtr + 0).toString(16))
	console.log(gBuffer.readByteAt(enemyDataPtr + 1).toString(16))
	console.log(gBuffer.readByteAt(enemyDataPtr + 2).toString(16))
	console.log(gBuffer.readByteAt(enemyDataPtr + 3).toString(16))
	console.log(gBuffer.readByteAt(enemyDataPtr + 4).toString(16))
	
	let objects = []
	let objectIterator = 2
	let objectCurrentX = 0
	while (true)
	{
		const objectByte1 = gBuffer.readByteAt(areaDataPtr + objectIterator)
		objectIterator += 1
		
		if (objectByte1 == 0xfd)
			break
		
		const objectByte2 = gBuffer.readByteAt(areaDataPtr + objectIterator)
		objectIterator += 1
		
		if ((objectByte2 & 0x80) != 0)
			objectCurrentX += 0x10
		
		objects.push({
			x: 16 * (objectCurrentX + ((objectByte1 & 0xf0) >> 4)),
			y: 16 * (objectByte1 & 0x0f),
			id: objectByte2 & 0x7f
		})
	}
	
	console.log(objects)
	
	let enemies = []
	let enemyIterator = 0
	let enemyCurrentX = 0
	while (true)
	{
		const enemyByte1 = gBuffer.readByteAt(enemyDataPtr + enemyIterator)
		enemyIterator += 1
		
		if (enemyByte1 == 0xff)
			break
		
		const enemyByte2 = gBuffer.readByteAt(enemyDataPtr + enemyIterator)
		enemyIterator += 1
		
		if ((enemyByte2 & 0x80) != 0)
			enemyCurrentX += 0x10
		
		if ((enemyByte1 & 0x0f) == 0x0f)
			continue
		
		enemies.push({
			x: 16 * (enemyCurrentX + ((enemyByte1 & 0xf0) >> 4)),
			y: 16 * (enemyByte1 & 0x0f),
			id: enemyByte2 & 0b00111111
		})
		
		if ((enemyByte1 & 0x0f) == 0x0e)
			enemyIterator += 1
	}
	
	console.log(enemies)
	
	let ctx = canvas.getContext("2d")
	ctx.fillStyle = "#000"
	ctx.fillRect(0, 0, 5120, 240)
	ctx.fillStyle = "#d80"
	ctx.fillRect(0, 240 - 48, 5120, 48)
	
	for (const obj of objects)
	{
		ctx.fillStyle = "#fff"
		if (drawDebug)
			ctx.fillText(obj.id.toString() + " 0x" + obj.id.toString(16), obj.x + 16, obj.y + 10)
		
		switch (obj.id)
		{
			case 0x0: // Question Block (mushroom/fire flower)
			case 0x1: // Question Block (coin)
				drawBackgroundMetatile2x2(ctx, obj.x, obj.y, [0x53, 0x54, 0x55, 0x56])
				break
			case 0x6: // Brick Block (star)
			case 0x7: // Brick Block (mushroom/fire flower)
				drawBackgroundMetatile2x2(ctx, obj.x, obj.y, [0x47, 0x47, 0x47, 0x47])
				break
			case 0x10: // Mushroom Platform (width 1)
			case 0x11: // Mushroom Platform (width 2)
			case 0x12: // Mushroom Platform (width 3)
			case 0x13: // Mushroom Platform (width 4)
			case 0x14: // Mushroom Platform (width 5)
			case 0x15: // Mushroom Platform (width 6)
			case 0x16: // Mushroom Platform (width 7)
			case 0x17: // Mushroom Platform (width 8)
			{
				const width = (obj.id & 0x7)
				drawBackgroundMetatile2x2(ctx, obj.x,              obj.y, [0x6b, 0x2c, 0x70, 0x2d])
				drawBackgroundMetatile2x2(ctx, obj.x + width * 16, obj.y, [0x6e, 0x6f, 0x73, 0x74])
				for (let i = 0; i < width - 1; i++)
					drawBackgroundMetatile2x2(ctx, obj.x + (i + 1) * 16, obj.y, [0x6c, 0x6d, 0x71, 0x72])
				break
			}
			case 0x20: // Brick Block (width 1)
			case 0x21: // Brick Block (width 2)
			case 0x22: // Brick Block (width 3)
			case 0x23: // Brick Block (width 4)
			case 0x24: // Brick Block (width 5)
			case 0x25: // Brick Block (width 6)
			case 0x26: // Brick Block (width 7)
			case 0x27: // Brick Block (width 8)
			{
				drawBackgroundMetatile2x2(ctx, obj.x, obj.y, [0x47, 0x47, 0x47, 0x47])
				for (let i = 0; i < (obj.id & 0x7); i++)
					drawBackgroundMetatile2x2(ctx, obj.x + (i + 1) * 16, obj.y, [0x47, 0x47, 0x47, 0x47])
				break
			}
			case 0x40: // Coin (width 1)
			case 0x41: // Coin (width 2)
			case 0x42: // Coin (width 3)
			case 0x43: // Coin (width 4)
			case 0x44: // Coin (width 5)
			case 0x45: // Coin (width 6)
			case 0x46: // Coin (width 7)
			case 0x47: // Coin (width 8)
			{
				drawBackgroundMetatile2x2(ctx, obj.x, obj.y, [0xa5, 0xa6, 0xa7, 0xa8])
				for (let i = 0; i < (obj.id & 0x7); i++)
					drawBackgroundMetatile2x2(ctx, obj.x + (i + 1) * 16, obj.y, [0xa5, 0xa6, 0xa7, 0xa8])
				break
			}
			case 0x50: // Brick Block (height 1)
			case 0x51: // Brick Block (height 2)
			case 0x52: // Brick Block (height 3)
			case 0x53: // Brick Block (height 4)
			case 0x54: // Brick Block (height 5)
			case 0x55: // Brick Block (height 6)
			case 0x56: // Brick Block (height 7)
			case 0x57: // Brick Block (height 8)
			{
				drawBackgroundMetatile2x2(ctx, obj.x, obj.y, [0x47, 0x47, 0x47, 0x47])
				for (let i = 0; i < (obj.id & 0x7); i++)
					drawBackgroundMetatile2x2(ctx, obj.x, obj.y + (i + 1) * 16, [0x47, 0x47, 0x47, 0x47])
				break
			}
			case 0x60: // Solid Block (height 2)
			case 0x61: // Solid Block (height 3)
			case 0x62: // Solid Block (height 4)
			case 0x63: // Solid Block (height 5)
			case 0x64: // Solid Block (height 6)
			case 0x65: // Solid Block (height 7)
			case 0x66: // Solid Block (height 8)
			case 0x67: // Solid Block (height 9)
			{
				//drawBackgroundMetatile2x2(ctx, obj.x, obj.y, [0xab, 0xad, 0xac, 0xae])
				for (let i = 0; i <= (obj.id & 0x7); i++)
					drawBackgroundMetatile2x2(ctx, obj.x +  0, obj.y + (i + 1) * 16, [0xab, 0xad, 0xac, 0xae])
				break
			}
			case 0x70: // Pipe (height 2)
			case 0x71: // Pipe (height 3)
			case 0x72: // Pipe (height 4)
			case 0x73: // Pipe (height 5)
			case 0x74: // Pipe (height 6)
			case 0x75: // Pipe (height 7)
			case 0x76: // Pipe (height 8)
			case 0x77: // Pipe (height 9)
			case 0x78: // Pipe (height 2, enterable)
			case 0x79: // Pipe (height 3, enterable)
			case 0x7a: // Pipe (height 4, enterable)
			case 0x7b: // Pipe (height 5, enterable)
			case 0x7c: // Pipe (height 6, enterable)
			case 0x7d: // Pipe (height 7, enterable)
			case 0x7e: // Pipe (height 8, enterable)
			case 0x7f: // Pipe (height 9, enterable)
			{
				drawBackgroundMetatile2x2(ctx, obj.x +  0, obj.y, [0x60, 0x61, 0x64, 0x65])
				drawBackgroundMetatile2x2(ctx, obj.x + 16, obj.y, [0x62, 0x63, 0x66, 0x67])
				for (let i = 0; i <= (obj.id & 0x7); i++)
				{
					drawBackgroundMetatile2x2(ctx, obj.x +  0, obj.y + (i + 1) * 16, [0x68, 0x69, 0x68, 0x69])
					drawBackgroundMetatile2x2(ctx, obj.x + 16, obj.y + (i + 1) * 16, [0x26, 0x6a, 0x26, 0x6a])
				}
				break
			}
			default:
				ctx.fillRect(obj.x, obj.y, 16, 16)
				break
		}
	}
	
	for (const en of enemies)
	{
		ctx.fillStyle = "#f00"
		ctx.fillRect(en.x, en.y, 16, 16)
		
		if (drawDebug)
			ctx.fillText(en.id.toString() + " 0x" + en.id.toString(16), en.x + 16, en.y + 10)
		
		switch (en.id)
		{
			case 0x0: // Green Koopa
			case 0x3: // Red Koopa
				drawEnemySprite2x3(ctx, en.x, en.y, [0xfc, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9])
				break
			case 0x2: // Buzzy Beetle
				drawEnemySprite2x2(ctx, en.x, en.y, [0xaa, 0xab, 0xac, 0xad])
				break
			case 0x5: // Hammer Bro
				drawEnemySprite2x3(ctx, en.x, en.y, [0x7d, 0x7c, 0xd1, 0x8c, 0xd3, 0xd2])
				break
			case 0x6: // Goomba
				drawEnemySprite2x2(ctx, en.x, en.y, [0x70, 0x71, 0x72, 0x73])
				break
			case 0x7: // Blooper
				drawEnemySprite2x2(ctx, en.x, en.y, [0xdc, 0xdc, 0xdf, 0xdf])
				break
			case 0xa: // Gray Cheep-cheep
			case 0xb: // Red Cheep-cheep
				drawEnemySprite2x2(ctx, en.x, en.y, [0xb2, 0xb3, 0xb4, 0xb5])
				break
			case 0xd: // Piranha Plant
				drawEnemySprite2x3(ctx, en.x, en.y, [0xe5, 0xe5, 0xe6, 0xe6, 0xeb, 0xeb])
				break
			case 0xe: // Green Paratroopa (Jump)
			case 0xf: // Red Paratroopa (Fly)
			case 0x10: // Green Paratroopa (Fly)
				drawEnemySprite2x3(ctx, en.x, en.y, [0x69, 0xa5, 0x6a, 0xa7, 0xa8, 0xa9])
				break
			case 0x11: // Lakitu
				drawEnemySprite2x3(ctx, en.x, en.y, [0xb9, 0xb8, 0xbb, 0xba, 0xbc, 0xbc])
				break
			case 0x12: // Spiny
				drawEnemySprite2x2(ctx, en.x, en.y, [0x96, 0x97, 0x98, 0x99])
				break
		}
	}
}


function drawBackgroundMetatile2x2(ctx, x, y, ids)
{
	drawSprite(ctx, x + 0, y + 0, 0x1000, ids[0])
	drawSprite(ctx, x + 8, y + 0, 0x1000, ids[1])
	drawSprite(ctx, x + 0, y + 8, 0x1000, ids[2])
	drawSprite(ctx, x + 8, y + 8, 0x1000, ids[3])
}


function drawEnemySprite2x2(ctx, x, y, ids)
{
	drawSprite(ctx, x + 0, y + 0, 0x0000, ids[0])
	drawSprite(ctx, x + 8, y + 0, 0x0000, ids[1])
	drawSprite(ctx, x + 0, y + 8, 0x0000, ids[2])
	drawSprite(ctx, x + 8, y + 8, 0x0000, ids[3])
}


function drawEnemySprite2x3(ctx, x, y, ids)
{
	if (ids[0] != 0xfc) drawSprite(ctx, x + 0, y - 8, 0x0000, ids[0])
	if (ids[1] != 0xfc) drawSprite(ctx, x + 8, y - 8, 0x0000, ids[1])
	drawSprite(ctx, x + 0, y + 0, 0x0000, ids[2])
	drawSprite(ctx, x + 8, y + 0, 0x0000, ids[3])
	drawSprite(ctx, x + 0, y + 8, 0x0000, ids[4])
	drawSprite(ctx, x + 8, y + 8, 0x0000, ids[5])
}


function drawSprite(ctx, x, y, tableBase, tileId)
{
	for (let j = 0; j < 8; j++)
	{
		const patternLow = gBuffer.readChrByteAt(tableBase + (tileId << 4) + j)
		const patternHigh = gBuffer.readChrByteAt(tableBase + (tileId << 4) + j + 8)
		for (let i = 0; i < 8; i++)
		{
			const bitLow = (patternLow & (0x1 << (7 - i))) != 0
			const bitHigh = (patternHigh & (0x1 << (7 - i))) != 0
			ctx.fillStyle = (bitLow ? (bitHigh ? "#444" : "#888") : (bitHigh ? "#ccc" : "#fff"))
			ctx.fillRect(x + i, y + j, 1, 1)
		}
	}
}