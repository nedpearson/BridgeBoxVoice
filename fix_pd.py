with open('src/pages/ProjectDetailPage.tsx', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    "if (orchResult.state === 'READY' && orchResult.url) {",
    "if (orchResult.url) { // save whenever any URL returned"
)
c = c.replace(
    "          staging_url: orchResult.url,\n          status: 'deployed'\n        }).eq('id', project.id)",
    "          status: 'deployed'\n        }).eq('id', project.id)"
)
# Add staging_url to the update block
c = c.replace(
    "          production_url: orchResult.url,\n          status: 'deployed'\n        }).eq('id', project.id)",
    "          production_url: orchResult.url,\n          staging_url: orchResult.url,\n          status: 'deployed'\n        }).eq('id', project.id)"
)
c = c.replace(
    "          production_url: orchResult.url,\n          status: 'deployed'\n        } : prev)",
    "          production_url: orchResult.url,\n          staging_url: orchResult.url,\n          status: 'deployed'\n        } : prev)"
)
c = c.replace(
    "const liveUrl = (project as any).production_url || project.web_app_url",
    "const liveUrl = (project as any).production_url || (project as any).staging_url || project.web_app_url"
)
c = c.replace(
    "const hasLiveUrl = liveUrl && !liveUrl.startsWith('/') && liveUrl.includes('.')",
    "const hasLiveUrl = liveUrl && typeof liveUrl === 'string' && liveUrl.length > 4 && (liveUrl.includes('.') || liveUrl.startsWith('http'))"
)

with open('src/pages/ProjectDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
