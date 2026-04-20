// Carousel - uses embla-carousel-react directly
import * as React from "react"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"
import { cn } from "@/lib/utils"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = { opts?: CarouselOptions; plugins?: CarouselPlugin; orientation?: "horizontal" | "vertical"; setApi?: (api: CarouselApi) => void }
type CarouselContextProps = { carouselRef: ReturnType<typeof useEmblaCarousel>[0]; api: ReturnType<typeof useEmblaCarousel>[1]; scrollPrev: () => void; scrollNext: () => void; canScrollPrev: boolean; canScrollNext: boolean } & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) throw new Error("useCarousel must be used within a <Carousel />")
  return context
}

const Carousel = ({ orientation = "horizontal", opts, setApi, plugins, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & CarouselProps) => {
  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: orientation === "horizontal" ? "x" : "y" }, plugins)
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api])
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api])

  React.useEffect(() => { if (!api || !setApi) return; setApi(api) }, [api, setApi])
  React.useEffect(() => { if (!api) return; onSelect(api); api.on("reInit", onSelect); api.on("select", onSelect); return () => { api?.off("select", onSelect) } }, [api, onSelect])

  return (
    <CarouselContext.Provider value={{ carouselRef, api, opts, orientation, scrollPrev, scrollNext, canScrollPrev, canScrollNext }}>
      <div role="region" aria-roledescription="carousel" className={cn("relative", className)} {...props}>{children}</div>
    </CarouselContext.Provider>
  )
}

const CarouselContent = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => {
  const { carouselRef, orientation } = useCarousel()
  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div ref={ref} className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)} {...props} />
    </div>
  )
}

const CarouselItem = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => {
  const { orientation } = useCarousel()
  return <div ref={ref} role="group" aria-roledescription="slide" className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? "pl-4" : "pt-4", className)} {...props} />
}

const CarouselPrevious = ({ className, variant = "outline", size = "icon", ref, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; ref?: React.Ref<HTMLButtonElement> }) => {
  const { scrollPrev, canScrollPrev, orientation } = useCarousel()
  return (
    <button ref={ref} disabled={!canScrollPrev} onClick={scrollPrev} className={cn("absolute h-8 w-8 rounded-full border bg-background flex items-center justify-center", orientation === "horizontal" ? "-left-12 top-1/2 -translate-y-1/2" : "-top-12 left-1/2 -translate-x-1/2 rotate-90", className)} {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
  )
}

const CarouselNext = ({ className, variant = "outline", size = "icon", ref, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; ref?: React.Ref<HTMLButtonElement> }) => {
  const { scrollNext, canScrollNext, orientation } = useCarousel()
  return (
    <button ref={ref} disabled={!canScrollNext} onClick={scrollNext} className={cn("absolute h-8 w-8 rounded-full border bg-background flex items-center justify-center", orientation === "horizontal" ? "-right-12 top-1/2 -translate-y-1/2" : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90", className)} {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  )
}

export { type CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext }
