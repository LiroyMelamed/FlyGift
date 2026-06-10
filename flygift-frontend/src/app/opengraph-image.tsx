import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FlyGift — שולחים חוויות";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #050B14 0%, #0D1B2A 45%, #112538 100%)",
                    color: "white",
                    fontFamily: "sans-serif",
                    position: "relative",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "radial-gradient(circle at 20% 20%, rgba(0,194,203,0.18) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(242,197,92,0.16) 0%, transparent 40%)",
                    }}
                />
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 24,
                        zIndex: 1,
                    }}
                >
                    <div
                        style={{
                            fontSize: 28,
                            letterSpacing: "0.35em",
                            color: "#F2C55C",
                            textTransform: "uppercase",
                        }}
                    >
                        ✈ FlyGift
                    </div>
                    <div
                        style={{
                            fontSize: 72,
                            fontWeight: 700,
                            lineHeight: 1.1,
                            textAlign: "center",
                            maxWidth: 900,
                        }}
                    >
                        שולחים חוויות, לא שוברים
                    </div>
                    <div
                        style={{
                            fontSize: 32,
                            color: "#94A3B8",
                            textAlign: "center",
                        }}
                    >
                        כרטיסי מתנה דיגיטליים לטיסות ומלונות
                    </div>
                </div>
            </div>
        ),
        { ...size },
    );
}
