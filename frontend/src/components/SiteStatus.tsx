import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { FiClock, FiGlobe, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import apiService from '../services/api'

interface SiteStatusData {
    currentUrl: string
    urlHistory: string[]
    lastChecked: string
    responseTime: number
    isHealthy: boolean
}

interface SiteStatusProps {
    onSearchTriggered?: () => void
}

export interface SiteStatusRef {
    refreshStatus: () => void
}

const SiteStatus = forwardRef<SiteStatusRef, SiteStatusProps>(({ onSearchTriggered }, ref) => {
    const [siteStatus, setSiteStatus] = useState<SiteStatusData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchSiteStatus()
    }, [])

    // Exposer la fonction de rafraîchissement au composant parent
    useEffect(() => {
        if (onSearchTriggered) {
            onSearchTriggered()
        }
    }, [onSearchTriggered])

    // Fonction pour rafraîchir le statut (exposée via ref)
    const refreshStatus = () => {
        fetchSiteStatus()
    }

    // Exposer la fonction refreshStatus au composant parent via ref
    useImperativeHandle(ref, () => ({
        refreshStatus
    }))

    const fetchSiteStatus = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await apiService.getSiteStatus()
            setSiteStatus(response.data)
        } catch (err: any) {
            setError(err.message || 'Erreur lors du chargement du statut')
        } finally {
            setIsLoading(false)
        }
    }

    const formatResponseTime = (time: number) => {
        if (time < 1000) {
            return `${time}ms`
        }
        return `${(time / 1000).toFixed(1)}s`
    }

    const formatLastChecked = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) return 'À l\'instant'
        if (diffMins < 60) return `Il y a ${diffMins}min`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `Il y a ${diffHours}h`
        const diffDays = Math.floor(diffHours / 24)
        return `Il y a ${diffDays}j`
    }

    if (isLoading) {
        return (
            <div className="card mb-6">
                <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                    <span className="text-gray-300">Chargement du statut...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="card mb-6 border-red-500/20 bg-red-500/5">
                <div className="flex items-center space-x-3">
                    <FiAlertCircle className="h-5 w-5 text-red-400" />
                    <span className="text-red-300">Erreur: {error}</span>
                </div>
            </div>
        )
    }

    if (!siteStatus) {
        return null
    }

    return (
        <div className="card mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        {siteStatus.isHealthy ? (
                            <FiCheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                            <FiAlertCircle className="h-5 w-5 text-yellow-400" />
                        )}
                        <span className="text-sm font-medium text-gray-300">
                            Zone Téléchargement
                        </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <FiGlobe className="h-4 w-4" />
                        <span className="truncate max-w-[200px]" title={siteStatus.currentUrl}>
                            {siteStatus.currentUrl.replace('https://', '')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                        <FiClock className="h-4 w-4" />
                        <span>{formatResponseTime(siteStatus.responseTime)}</span>
                    </div>

                    <div className="text-xs">
                        {formatLastChecked(siteStatus.lastChecked)}
                    </div>
                </div>
            </div>
        </div>
    )
})

SiteStatus.displayName = 'SiteStatus'

export default SiteStatus
