import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { requireAuth } from '@/lib/auth-middleware';
import { validateApiKey } from '@/lib/api-key';

export const dynamic = 'force-dynamic'; // Cache 15 minutes

export async function GET(request: Request) {
  let userId = null;
  const urlParams = new URL(request.url).searchParams;
  const apiKey = request.headers.get("authorization")?.replace("Bearer ", "") || urlParams.get("apikey");

  if (apiKey) {
    const authResult = await validateApiKey(request as any, "bmkg-weather");
    if (authResult.error) return NextResponse.json({ error: true, message: authResult.error }, { status: authResult.status });
    userId = authResult.keyData?.userId;
  } else {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
    userId = auth.user!.id;
  }

  try {
    const url = new URL(request.url);
    const province = url.searchParams.get('province') || 'Indonesia';
    const city = url.searchParams.get('city');
    
    let bmkgFile = 'DigitalForecast-Indonesia.xml';
    
    const provinceMap: Record<string, string> = {
      'Aceh': 'DigitalForecast-Aceh.xml',
      'Bali': 'DigitalForecast-Bali.xml',
      'Banten': 'DigitalForecast-Banten.xml',
      'Bengkulu': 'DigitalForecast-Bengkulu.xml',
      'DIYogyakarta': 'DigitalForecast-DIYogyakarta.xml',
      'DKIJakarta': 'DigitalForecast-DKIJakarta.xml',
      'Gorontalo': 'DigitalForecast-Gorontalo.xml',
      'Jambi': 'DigitalForecast-Jambi.xml',
      'JawaBarat': 'DigitalForecast-JawaBarat.xml',
      'JawaTengah': 'DigitalForecast-JawaTengah.xml',
      'JawaTimur': 'DigitalForecast-JawaTimur.xml',
      'KalimantanBarat': 'DigitalForecast-KalimantanBarat.xml',
      'KalimantanSelatan': 'DigitalForecast-KalimantanSelatan.xml',
      'KalimantanTengah': 'DigitalForecast-KalimantanTengah.xml',
      'KalimantanTimur': 'DigitalForecast-KalimantanTimur.xml',
      'KalimantanUtara': 'DigitalForecast-KalimantanUtara.xml',
      'KepulauanBangkaBelitung': 'DigitalForecast-BangkaBelitung.xml',
      'KepulauanRiau': 'DigitalForecast-KepulauanRiau.xml',
      'Lampung': 'DigitalForecast-Lampung.xml',
      'Maluku': 'DigitalForecast-Maluku.xml',
      'MalukuUtara': 'DigitalForecast-MalukuUtara.xml',
      'NusaTenggaraBarat': 'DigitalForecast-NusaTenggaraBarat.xml',
      'NusaTenggaraTimur': 'DigitalForecast-NusaTenggaraTimur.xml',
      'Papua': 'DigitalForecast-Papua.xml',
      'PapuaBarat': 'DigitalForecast-PapuaBarat.xml',
      'Riau': 'DigitalForecast-Riau.xml',
      'SulawesiBarat': 'DigitalForecast-SulawesiBarat.xml',
      'SulawesiSelatan': 'DigitalForecast-SulawesiSelatan.xml',
      'SulawesiTengah': 'DigitalForecast-SulawesiTengah.xml',
      'SulawesiTenggara': 'DigitalForecast-SulawesiTenggara.xml',
      'SulawesiUtara': 'DigitalForecast-SulawesiUtara.xml',
      'SumateraBarat': 'DigitalForecast-SumateraBarat.xml',
      'SumateraSelatan': 'DigitalForecast-SumateraSelatan.xml',
      'SumateraUtara': 'DigitalForecast-SumateraUtara.xml',
    };

    if (province !== 'Indonesia' && provinceMap[province]) {
        bmkgFile = provinceMap[province];
    }

    const fetchOptions: RequestInit = {
      next: { revalidate: 900 }
    };

    const res = await fetch(`https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/${bmkgFile}`, fetchOptions);
    
    if (!res.ok) {
        return NextResponse.json({ error: true, message: 'Gagal mengambil data dari BMKG. Server BMKG mungkin sedang down.' }, { status: 502 });
    }

    const xmlData = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const result = parser.parse(xmlData);
    
    const forecast = result?.data?.forecast;
    if (!forecast) {
        return NextResponse.json({ error: true, message: 'Format data tidak valid dari BMKG' }, { status: 500 });
    }

    const issue = forecast.issue;
    let areasRaw = forecast.area || [];
    if (!Array.isArray(areasRaw)) areasRaw = [areasRaw];

    // Filter out empty areas or areas without parameters
    const areas = areasRaw.filter((a: any) => a.parameter).map((area: any) => {
        let name = area['@_description'];
        
        let parametersRaw = area.parameter || [];
        if (!Array.isArray(parametersRaw)) parametersRaw = [parametersRaw];
        
        const params = parametersRaw.map((param: any) => {
            let timeRaw = param.timerange || [];
            if (!Array.isArray(timeRaw)) timeRaw = [timeRaw];

            const times = timeRaw.map((t: any) => {
                let valueRaw = t.value || [];
                if (!Array.isArray(valueRaw)) valueRaw = [valueRaw];
                
                const values = valueRaw.map((v: any) => ({
                    unit: v['@_unit'],
                    value: v['#text']
                }));

                return { 
                    datetime: t['@_datetime'], 
                    values 
                };
            });

            return { 
                id: param['@_id'], 
                description: param['@_description'], 
                type: param['@_type'], 
                times 
            };
        });

        return { 
            id: area['@_id'], 
            name, 
            latitude: area['@_latitude'], 
            longitude: area['@_longitude'], 
            domain: area['@_domain'], 
            parameters: params 
        };
    });

    let filteredAreas = areas;
    if (city) {
        const query = city.toLowerCase();
        filteredAreas = areas.filter((a: any) => 
            a.name.toLowerCase().includes(query) || 
            a.domain.toLowerCase().includes(query)
        );
    }

    return NextResponse.json({
        error: false,
        source: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
        issue: issue,
        province: province,
        city: city || undefined,
        areas: filteredAreas
    });

  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
