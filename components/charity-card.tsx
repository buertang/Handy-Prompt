import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { browser } from 'wxt/browser'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface CharityData {
  id: string
  name: string
  sex: string
  birth_time: string
  lost_time: string
  child_pic: string
  lost_place: string
  url: string
  child_feature: string
  province: string
  city: string
}

export function CharityCard() {
  const [data, setData] = useState<CharityData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      // 委托给 background script 请求，以绕过 CORS/Referrer 限制
      const response = await browser.runtime.sendMessage({ type: 'FETCH_CHARITY_DATA' })

      if (response.success && response.data) {
        setData(response.data)
      } else {
        throw new Error(response.error || 'Unknown error from background')
      }
    } catch (err) {
      console.error('Failed to fetch charity data:', err)
      // Use mock data on error as fallback
      setData({
        id: "4041008610072",
        name: "李洪娇",
        sex: "女",
        birth_time: "2002年06月28日",
        lost_time: "2016年09月08日",
        child_pic: "https://qzone.qq.com/gy/upload/upfile_3352783_1477652237.jpg",
        lost_place: "山东省枣庄市级索镇中学",
        url: "http://404.baobeihuijia.com/thread-352182-1-1.html",
        child_feature: "体型偏瘦，带边框为紫色的眼睛，扎马尾辫。失踪时穿着背粉红色书包，穿蓝色牛仔裤。",
        province: "山东",
        city: "枣庄市级索镇中学"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className="h-[320px] mx-2 mb-2 bg-muted/30 overflow-hidden">
        <CardContent className="p-0 h-full flex flex-col">
          <Skeleton className="h-32 w-full rounded-none" />
          <div className="p-3 space-y-2 flex-1">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full rounded-md mt-2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="h-[320px] mx-2 py-0 gap-0.5 mb-2 bg-background hover:bg-muted/30 transition-colors overflow-hidden flex flex-col shadow-sm border-input">
      {/* 顶部图片区域 - 固定高度 */}
      <div className="relative h-32 w-full shrink-0 overflow-hidden bg-secondary/20 group">
        <HoverCard openDelay={0} closeDelay={0}>
          <HoverCardTrigger asChild>
            <div className="w-full h-full relative cursor-zoom-in">
              {/* 背景模糊层 - 解决图片比例问题造成的空白突兀感 */}
              <div
                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-110"
                style={{ backgroundImage: `url(${data.child_pic})` }}
              />

              <img
                src={data.child_pic}
                alt={data.name}
                className="relative h-full w-full object-contain z-10"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          </HoverCardTrigger>
          <HoverCardContent
            className="w-[var(--radix-hover-card-trigger-width)] p-0 border-none bg-transparent shadow-none"
            align="start"
            side="top"
            sideOffset={-128} // 覆盖在原图位置
          >
            <div className="rounded-md overflow-hidden shadow-xl border bg-background">
              <img
                src={data.child_pic}
                alt={data.name}
                className="w-full h-auto object-contain block"
              />
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* 内容区域 - 可滚动 */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="p-3 space-y-2">
          {/* 姓名和ID行 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-foreground leading-tight">{data.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
                onClick={fetchData}
                title="刷新"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={data.sex === '男' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1">
                {data.sex}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono">#{data.id.slice(-6)}</span>

              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                详情 <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          {/* 详细信息列表 */}
          <div className="space-y-1 text-xs text-muted-foreground/90">
            <div className="flex gap-2">
              <span className="shrink-0 w-8 text-muted-foreground">出生:</span>
              <span className="font-medium text-foreground">{data.birth_time}</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 w-8 text-muted-foreground">失踪:</span>
              <span className="font-medium text-foreground">{data.lost_time}</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 w-8 text-muted-foreground">地点:</span>
              <span className="font-medium text-foreground break-all">{data.lost_place}</span>
            </div>
          </div>

          {/* 特征描述框 */}
          <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground leading-relaxed border border-border/50">
            <span className="font-semibold text-foreground mr-1">特征:</span>
            {data.child_feature}
          </div>

          {/* 底部联系/详情 */}
          <div className="pt-1 flex items-center justify-center text-[10px] text-muted-foreground border-t border-border/50 mt-2">
            <span>如有线索请联系 0435-3338090</span>
          </div>
        </div>
      </ScrollArea>
    </Card>
  )
}
