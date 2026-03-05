"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface DataPaginationProps {
    /** Página atual (1-indexed) */
    currentPage: number
    /** Total de itens */
    totalItems: number
    /** Itens por página */
    pageSize: number
    /** Callback ao mudar de página */
    onPageChange: (page: number) => void
}

export function DataPagination({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
}: DataPaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems)
    const endItem = Math.min(currentPage * pageSize, totalItems)

    if (totalItems <= pageSize) return null

    return (
        <div className="flex items-center justify-between w-full px-2 py-1">
            <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{startItem}</span> a{" "}
                <span className="font-medium">{endItem}</span> de{" "}
                <span className="font-medium">{totalItems}</span> itens
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage <= 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 mx-2">
                    <span className="text-sm text-muted-foreground">
                        Página <span className="font-medium">{currentPage}</span> de{" "}
                        <span className="font-medium">{totalPages}</span>
                    </span>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage >= totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
