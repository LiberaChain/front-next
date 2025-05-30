import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { uploadToIpfs, getFromIpfs } from "../../_core/storage/ipfs/ipfs-http";

// Secure cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

// Parse our secure storage cookie
const getSecureStorage = async () => {
  const cookieStore = await cookies();
  const storageCookie = cookieStore.get("secureAppStorage");

  if (!storageCookie) {
    return {};
  }

  try {
    return JSON.parse(storageCookie.value);
  } catch (error) {
    console.error("Error parsing secure storage cookie:", error);
    return {};
  }
};

// Get data from secure storage or IPFS
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "get") {
      const key = searchParams.get("key");
      if (!key) {
        return NextResponse.json(
          { success: false, error: "Key is required" },
          { status: 400 }
        );
      }
      const secureStorage = await getSecureStorage();
      const data = secureStorage[key];
      return NextResponse.json({ success: true, data });
    }

    if (action === "ipfs") {
      const cid = searchParams.get("cid");
      if (!cid) {
        return NextResponse.json(
          { error: "CID parameter is required" },
          { status: 400 }
        );
      }
      const content = await getFromIpfs(cid);
      return NextResponse.json({ success: true, data: content });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in storage API:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Handle secure storage and IPFS uploads
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, key, data, content } = body;

    if (action === "set" || action === "remove") {
      if (!key) {
        return NextResponse.json(
          { success: false, error: "Key is required" },
          { status: 400 }
        );
      }

      const secureStorage = await getSecureStorage();

      if (action === "set") {
        // Store data
        secureStorage[key] = data;
      } else {
        // Remove data
        delete secureStorage[key];
      }

      // Update the cookie with new storage data
      cookies().set(
        "secureAppStorage",
        JSON.stringify(secureStorage),
        COOKIE_OPTIONS
      );
      return NextResponse.json({ success: true });
    }

    if (action === "ipfs") {
      if (!content) {
        return NextResponse.json(
          { error: "Content is required" },
          { status: 400 }
        );
      }
      const cid = await uploadToIpfs(content);
      return NextResponse.json({ success: true, cid });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in storage API:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
