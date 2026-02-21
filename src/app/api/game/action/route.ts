import {pusherServer} from "@/lib/socket-client";
import {NextResponse} from "next/server";

export async function POST(request: Request) {
    const {gameId, action} = await request.json();
    await pusherServer.trigger(gameId, "game-action", action);
    return NextResponse.json({message: "Action sent successfully"});
}

