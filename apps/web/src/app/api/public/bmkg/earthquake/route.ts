import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { requireAuth } from '@/lib/auth-middleware';
import { validateApiKey } from '@/lib/api-key';

export const dynamic = 'force-dynamic'; // Cache for 1 minute for earthquakes

export async function GET(request: Request) {
  let userId = null;
  const urlParams = new URL(request.url).searchParams;
  const apiKey = request.headers.get("authorization")?.replace("Bearer ", "") || urlParams.get("apikey");

  if (apiKey) {
    const authResult = await validateApiKey(request as any, "bmkg-earthquake");
    if (authResult.error) return NextResponse.json({ error: true, message: authResult.error }, { status: authResult.status });
    userId = authResult.keyData?.userId;
  } else {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
    userId = auth.user!.id;
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'latest'; // 'latest' (autogempa) or 'recent' (gempaterkini)
    
    let bmkgFile = 'autogempa.xml';
    if (type === 'recent') {
        bmkgFile = 'gempaterkini.xml';
    }

    const fetchOptions: RequestInit = {
      next: { revalidate: 60 }
    };

    const res = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/${bmkgFile}`, fetchOptions);
    
    if (!res.ok) {
        return NextResponse.json({ error: true, message: 'Gagal mengambil data dari BMKG.' }, { status: 502 });
    }

    const xmlData = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const result = parser.parse(xmlData);
    
    const infogempa = result?.Infogempa;
    if (!infogempa) {
        return NextResponse.json({ error: true, message: 'Format data tidak valid dari BMKG' }, { status: 500 });
    }

    // Determine base URL for Shakemap images
    const baseImageUrl = 'https://data.bmkg.go.id/DataMKG/TEWS/';

    if (type === 'latest') {
        const gempa = infogempa.gempa;
        if (!gempa) return NextResponse.json({ error: true, message: 'Data gempa tidak ditemukan' }, { status: 404 });
        
        return NextResponse.json({
            error: false,
            source: 'BMKG',
            type: 'latest',
            data: {
                tanggal: gempa.Tanggal,
                jam: gempa.Jam,
                datetime: gempa.DateTime,
                coordinates: gempa.Coordinates,
                lintang: gempa.Lintang,
                bujur: gempa.Bujur,
                magnitude: gempa.Magnitude,
                kedalaman: gempa.Kedalaman,
                wilayah: gempa.Wilayah,
                potensi: gempa.Potensi,
                dirasakan: gempa.Dirasakan,
                shakemap: gempa.Shakemap ? `${baseImageUrl}${gempa.Shakemap}` : null
            }
        });
    } else {
        let gempaList = infogempa.gempa || [];
        if (!Array.isArray(gempaList)) gempaList = [gempaList];

        const mappedList = gempaList.map((gempa: any) => ({
            tanggal: gempa.Tanggal,
            jam: gempa.Jam,
            datetime: gempa.DateTime,
            coordinates: gempa.Coordinates,
            lintang: gempa.Lintang,
            bujur: gempa.Bujur,
            magnitude: gempa.Magnitude,
            kedalaman: gempa.Kedalaman,
            wilayah: gempa.Wilayah,
            potensi: gempa.Potensi,
            shakemap: gempa.Shakemap ? `${baseImageUrl}${gempa.Shakemap}` : null
        }));

        return NextResponse.json({
            error: false,
            source: 'BMKG',
            type: 'recent',
            count: mappedList.length,
            data: mappedList
        });
    }

  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
