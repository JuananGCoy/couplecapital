import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CoupleCapital',
        short_name: 'CoupleCap',
        description: 'Gestor financiero compartido para parejas',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8fafc', // slate-50
        theme_color: '#4f46e5', // indigo-600
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
